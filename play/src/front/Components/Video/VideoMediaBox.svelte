<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import CancelablePromise from "cancelable-promise";
    import Debug from "debug";
    import { ArrowDownIcon, ArrowUpIcon } from "svelte-feather-icons";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { LL } from "../../../i18n/i18n-svelte";

    import Woka from "../Woka/WokaFromUserId.svelte";
    import { mediaStreamConstraintsStore, selectDefaultSpeaker, speakerSelectedStore } from "../../Stores/MediaStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import loaderImg from "../images/loader.svg";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import ScreenShareIcon from "../Icons/ScreenShareIcon.svelte";
    import { highlightFullScreen, setHeightScreenShare } from "../../Stores/ActionsCamStore";
    import ChevronRightIcon from "../Icons/ChevronRightIcon.svelte";
    import ActionMediaBox from "./ActionMediaBox.svelte";

    // Extend the HTMLVideoElement interface to add the setSinkId method.
    // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
    interface HTMLVideoElementExt extends HTMLVideoElement {
        setSinkId?(deviceId: string): Promise<void>;
        requestVideoFrameCallback(callback: VideoFrameRequestCallback, options?: IdleRequestOptions): number;
    }

    export let isHightlighted = false;
    export let peer: VideoPeer;

    let streamStore = peer.streamStore;
    let volumeStore = peer.volumeStore;
    let name = peer.userName;
    let backGroundColor = Color.getColorByString(peer.userName);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;
    let unsubscribeChangeOutput: Unsubscriber;
    let unsubscribeStreamStore: Unsubscriber;
    let unsubscribeConstraintStore: Unsubscriber;
    let embedScreen: Streamable;
    let cameraContainer: HTMLDivElement;
    let videoElement: HTMLVideoElementExt;
    let noVideoTimeout: ReturnType<typeof setTimeout> | undefined;
    let destroyed = false;
    let currentDeviceId: string | undefined;
    let displayNoVideoWarning = false;
    let showUserSubMenu = false;
    let aspectRatio = 1;
    let isHighlighted = false;
    let menuDrop = false;
    let unsubscribeHighlightEmbedScreen: Unsubscriber;
    let isMobile: boolean;
    let fullScreen = false;

    const debug = Debug("VideoMediaBox");

    if (peer) {
        embedScreen = peer as unknown as Streamable;
    }

    function updateScreenSize() {
        if (window.innerWidth < 768) {
            isMobile = true;
        } else if (window.innerWidth > 768 && window.innerWidth < 1024) {
            isMobile = false;
        }
    }

    window.addEventListener("resize", updateScreenSize);
    window.addEventListener("resize", calcHeightVideo);

    $: isMobile, calcHeightVideo();
    $: videoEnabled = $constraintStore ? $constraintStore.video : false;
    $: isHighlighted = $highlightedEmbedScreen === peer;

    function calcHeightVideo() {
        if (!cameraContainer) {
            return;
        }

        if ($highlightedEmbedScreen === peer && !$highlightFullScreen && !isMobile) {
            if (typeof setHeightScreenShare !== "undefined") {
                cameraContainer.style.height = `${$setHeightScreenShare}px`;
                cameraContainer.style.width = `${document.documentElement.clientWidth}px`;
            }
        } else if ($highlightFullScreen && $highlightedEmbedScreen === peer && isMobile) {
            cameraContainer.style.height = "auto";
            cameraContainer.style.width = "100%";
            cameraContainer.style.marginTop = "80%";
        } else {
            cameraContainer.style.marginTop = "0";
            cameraContainer.style.height = "100%";
            cameraContainer.style.width = "100%";
        }
    }

    unsubscribeHighlightEmbedScreen = highlightedEmbedScreen.subscribe((value) => {
        if (value) {
            isHightlighted = true;
        } else {
            isHightlighted = false;
        }
    });

    $: isHighlighted = $highlightedEmbedScreen === embedScreen;

    function toggleFullScreen() {
        highlightFullScreen.update((current) => !current);
        calcHeightVideo();
    }

    function untogglefFullScreen() {
        highlightedEmbedScreen.removeHighlight();
        highlightFullScreen.set(false);
        calcHeightVideo();
    }

    // TODO: check the race condition when setting sinkId is solved.
    // Also, read: https://github.com/nwjs/nw.js/issues/4340

    // A promise to chain calls to setSinkId and setting the srcObject
    // setSinkId must be resolved before setting the srcObject. See Chrome bug, according to https://bugs.chromium.org/p/chromium/issues/detail?id=971947&q=setsinkid&can=2
    let sinkIdPromise = CancelablePromise.resolve();

    onMount(() => {
        updateScreenSize();
        calcHeightVideo();
        unsubscribeChangeOutput = speakerSelectedStore.subscribe((deviceId) => {
            if (deviceId !== undefined) {
                setAudioOutput(deviceId);
            }
        });

        unsubscribeStreamStore = streamStore.subscribe((stream) => {
            debug("Stream store changed. Awaiting to set the stream to the video element.");
            sinkIdPromise = sinkIdPromise.then(() => {
                if (destroyed) {
                    // In case this function is called in a promise that resolves after the component is destroyed,
                    // let's ignore the call.
                    console.warn("streamStore modified after the component was destroyed. Call is ignored.");
                    return;
                }

                if (videoElement) {
                    debug("Setting stream to the video element.");
                    videoElement.srcObject = stream;
                    // After some tests, it appears that the sinkId is lost when the stream is set to the video element.
                    // Let's try to set it again.
                    /*if (currentDeviceId) {
                        debug("Setting the sinkId just after setting the stream.");
                        return videoElement.setSinkId?.(currentDeviceId);
                    }*/
                } else {
                    console.error("Video element is not defined. Cannot set the stream.");
                }
                return;
            });
            // updateRatio();
        });

        // Let's display a warning if the video stream never reaches the user.
        let wasVideoEnabled = false;
        unsubscribeConstraintStore = constraintStore.subscribe((constraints) => {
            if (wasVideoEnabled && !constraints?.video && noVideoTimeout) {
                // We were monitoring if a video frame was displayed but we don't need to anymore.
                clearTimeout(noVideoTimeout);
                noVideoTimeout = undefined;
            }

            // If the video was disabled but we now receive a message saying a video is incoming, we are starting
            // to monitor if a video frame is actually displayed. If not, we will display a warning.
            if (constraints?.video && !wasVideoEnabled) {
                // requestVideoFrameCallback is not yet available in all browsers. See https://developer.mozilla.org/en-US/docs/Web/API/HTMLVideoElement
                if ("requestVideoFrameCallback" in videoElement) {
                    // Let's wait 3 seconds before displaying a warning.
                    noVideoTimeout = setTimeout(() => {
                        displayNoVideoWarning = true;
                        noVideoTimeout = undefined;
                        analyticsClient.noVideoStreamReceived();
                    }, 3000);

                    videoElement.requestVideoFrameCallback(() => {
                        // A video frame was displayed. No need to display a warning.
                        displayNoVideoWarning = false;
                        clearTimeout(noVideoTimeout);
                        noVideoTimeout = undefined;
                    });
                }
            }

            wasVideoEnabled = constraints?.video ?? false;
            if (!wasVideoEnabled && isHightlighted) highlightedEmbedScreen.removeHighlight();
            updateRatio();
        });
    });

    onDestroy(() => {
        if (unsubscribeChangeOutput) unsubscribeChangeOutput();
        if (unsubscribeStreamStore) unsubscribeStreamStore();
        if (unsubscribeConstraintStore) unsubscribeConstraintStore();
        destroyed = true;
        sinkIdPromise.cancel();
        if (noVideoTimeout) {
            clearTimeout(noVideoTimeout);
            noVideoTimeout = undefined;
        }
        if (unsubscribeHighlightEmbedScreen) unsubscribeHighlightEmbedScreen();
        highlightFullScreen.set(false);
    });

    //sets the ID of the audio device to use for output
    function setAudioOutput(deviceId: string) {
        if (destroyed) {
            // In case this function is called in a promise that resolves after the component is destroyed,
            // let's ignore the call.
            console.warn("setAudioOutput called after the component was destroyed. Call is ignored.");
            return;
        }

        if (currentDeviceId === deviceId) {
            // No need to change the audio output if it's already the one we want.
            debug("setAudioOutput on already set deviceId. Ignoring call.");
            return;
        }
        currentDeviceId = deviceId;

        // Check HTMLMediaElement.setSinkId() compatibility for browser => https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
        debug("Awaiting to set sink id to ", deviceId);
        sinkIdPromise = sinkIdPromise.then(async () => {
            debug("Setting Sink Id to ", deviceId);

            const timeOutPromise = new Promise((resolve) => {
                setTimeout(resolve, 2000, "timeout");
            });

            try {
                const setSinkIdRacePromise = Promise.race([timeOutPromise, videoElement?.setSinkId?.(deviceId)]);

                let result = await setSinkIdRacePromise;
                if (result === "timeout") {
                    // In some rare case, setSinkId can NEVER return. I've seen this in Firefox on Linux with a Jabra.
                    // Let's fallback to default speaker if this happens.
                    console.warn("setSinkId timed out. Calling setSinkId again on default speaker.");
                    selectDefaultSpeaker();
                    return;
                } else {
                    console.info("Audio output device set to ", deviceId);
                    // Trying to set the stream again after setSinkId is set (for Chrome, according to https://bugs.chromium.org/p/chromium/issues/detail?id=971947&q=setsinkid&can=2)
                    /*if (videoElement && $streamStore) {
                        videoElement.srcObject = $streamStore;
                    }*/
                }
            } catch (e) {
                if (e instanceof DOMException && e.name === "AbortError") {
                    // An error occurred while setting the sinkId. Let's fallback to default.
                    console.warn("Error setting the audio output device. We fallback to default.");
                    selectDefaultSpeaker();
                    return;
                }
                console.info("Error setting the audio output device: ", e);
            }
        });
    }

    function updateRatio() {
        // TODO: remove this hack
        setTimeout(() => {
            aspectRatio = videoElement != undefined ? videoElement.videoWidth / videoElement.videoHeight : 1;
        }, 1000);
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="group/screenshare flex justify-center mx-auto aspect-video {$highlightFullScreen
        ? 'h-[100%] w-[100%] fixed top-0 left-0'
        : 'h-full relative w-full'}"
    class:test-class-deux={!$mediaStreamConstraintsStore.audio}
    on:click={() => analyticsClient.pinMeetingAction()}
    bind:this={cameraContainer}
    data-testid={!$mediaStreamConstraintsStore.audio && "test-class"}
>
    <div
        class="aspect-video z-20 rounded-lg transition-all h-full bg-no-repeat bg-center bg-contrast/80 backdrop-blur{$mediaStreamConstraintsStore.audio
            ? 'border-8 border-solid border-color rounded-lg'
            : ''}"
        style="background-image: url({loaderImg})"
        class:flex-col={videoEnabled}
        class:items-center={!videoEnabled || $statusStore === "connecting" || $statusStore === "error"}
        class:px-7={!videoEnabled}
        class:flex-row={!videoEnabled}
        class:relative={!videoEnabled}
        class:justify-center={$statusStore === "connecting" || $statusStore === "error"}
        class:object-contain={isHightlighted || aspectRatio < 1}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" />
        {:else if $statusStore === "error"}
            <div class="rtc-error" />
        {/if}

        <div class="flex justify-start">
            {#if $statusStore === "connected"}
                <div class="z-[251] absolute aspect-ratio p-4">
                    {#if $mediaStreamConstraintsStore.audio}
                        <SoundMeterWidget
                            volume={$volumeStore}
                            classcss="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                            barColor={textColor}
                        />
                    {:else}
                        <MicOffIcon />
                    {/if}
                </div>
            {/if}
        </div>

        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            bind:this={videoElement}
            class="h-full flex justify-center aspect-video"
            class:h-0={!videoEnabled}
            class:w-0={!videoEnabled}
            class:object-contain={isHightlighted || aspectRatio < 1}
            class:rounded-lg={videoEnabled}
            autoplay
            playsinline
        />

        <div
            class={isHighlighted
                ? "w-8 h-8 bg-contrast/80 flex rounded-sm z-10 opacity-0 group-hover/screenshare:opacity-100 absolute inset-0 mx-auto"
                : "hidden"}
            on:click={() => (menuDrop = !menuDrop)}
        >
            {#if menuDrop}
                <ArrowUpIcon class="w-4 h-4 m-auto flex items-center text-white" />
            {:else}
                <ArrowDownIcon class="w-4 h-4 m-auto flex items-center text-white" />
            {/if}
        </div>

        {#if videoEnabled}
            {#if displayNoVideoWarning}
                <div
                    class="absolute w-full h-full left-0 top-0 flex justify-center items-center bg-danger/50 text-white"
                >
                    <div class="text-center">
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-camera-exclamation"
                            width="32"
                            height="32"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path
                                d="M15 20h-10a2 2 0 0 1 -2 -2v-9a2 2 0 0 1 2 -2h1a2 2 0 0 0 2 -2a1 1 0 0 1 1 -1h6a1 1 0 0 1 1 1a2 2 0 0 0 2 2h1a2 2 0 0 1 2 2v3.5"
                            />
                            <path d="M9 13a3 3 0 1 0 6 0a3 3 0 0 0 -6 0" />
                            <path d="M19 16v3" />
                            <path d="M19 22v.01" />
                        </svg>
                        <div class="text-lg bold">{$LL.video.no_video_stream_received()}</div>
                        <div class="italic text-xs opacity-50">
                            {$LL.menu.sub.help()}
                        </div>
                    </div>
                </div>
            {/if}

            <div class="absolute bottom-4 left-2 z-30 responsive-dimension bg-contrast/90 rounded">
                <div
                    class="flex justify-between {$mediaStreamConstraintsStore.audio
                        ? 'background-color bg-contrast/90 rounded'
                        : ''} "
                >
                    <div class="relative rounded backdrop-blur px-2 py-1 text-white text-sm pl-12 bold ">
                        <div class="absolute left-1 -top-1 z-30" style="image-rendering:pixelated">
                            <Woka
                                userId={peer.userId}
                                placeholderSrc={""}
                                customHeight="42&& !$cameraEnergySavingStorepx"
                                customWidth="42px"
                            />
                        </div>
                        {name}

                        {#if $requestedScreenSharingState === true}
                            <ScreenShareIcon />
                        {/if}
                    </div>
                    <div
                        class="pt-1 rounded-sm hover:bg-white/20 right-0 top-0 bottom-0 m-auto h-6 transition-all pointer-events-auto {showUserSubMenu
                            ? 'bg-white/20 hover:bg-white/30'
                            : ''}"
                        id="user-menu-btn"
                        on:click={() => (showUserSubMenu = !showUserSubMenu)}
                    >
                        <ChevronRightIcon
                            strokeWidth="2.5"
                            height="h-4"
                            width="w-4"
                            classList="aspect-ratio transition-all {showUserSubMenu ? 'rotate-180' : ''}"
                        />
                    </div>

                    {#if showUserSubMenu}
                        <ActionMediaBox {embedScreen} trackStreamWraper={peer} {videoEnabled} />
                    {/if}
                    <!--  -->
                </div>
            </div>
        {/if}
    </div>
    <div
        class={isHighlighted
            ? "hidden"
            : "absolute top-0 bottom-0 right-0 left-0 m-auto h-14 w-14 z-20 p-4 rounded-full aspect-ratio bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 cursor-pointer"}
        on:click={() => highlightedEmbedScreen.highlight(peer)}
        on:click={calcHeightVideo}
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            class="icon icon-tabler cursor-pointer icon-tabler-arrows-minimize"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            stroke-width="1.5"
            stroke="#ffffff"
            fill="none"
            stroke-linecap="round"
            stroke-linejoin="round"
        >
            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
            <path d="M16 4l4 0l0 4" />
            <path d="M14 10l6 -6" />
            <path d="M8 20l-4 0l0 -4" />
            <path d="M4 20l6 -6" />
            <path d="M16 20l4 0l0 -4" />
            <path d="M14 14l6 6" />
            <path d="M8 4l-4 0l0 4" />
            <path d="M4 4l6 6" />
        </svg>
    </div>

    <div
        class={isHighlighted && menuDrop
            ? "absolute top-0 bottom-0 right-0 left-0 m-auto h-28 w-60 z-20 rounded-lg bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 flex items-center justify-center cursor-pointer"
            : "hidden"}
    >
        <div class="flex flex-col justify-evenly cursor-pointer h-full w-full">
            <div
                class="svg w-full hover:bg-white/10 flex justify-around items-center z-25 rounded-lg"
                on:click={untogglefFullScreen}
                on:click={() => (menuDrop = !menuDrop)}
            >
                <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="icon icon-tabler cursor-pointer icon-tabler-arrows-maximize"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    stroke-width="1.5"
                    stroke="#ffffff"
                    fill="none"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                >
                    <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                    <path d="M5 9l4 0l0 -4" />
                    <path d="M3 3l6 6" />
                    <path d="M5 15l4 0l0 4" />
                    <path d="M3 21l6 -6" />
                    <path d="M19 9l-4 0l0 -4" />
                    <path d="M15 9l6 -6" />
                    <path d="M19 15l-4 0l0 4" />
                    <path d="M15 15l6 6" />
                </svg>
                <p class="font-bold text-white">Reduce the screen</p>
            </div>
            <div class="h-[1px] z-30 w-full bg-white/20" />
            <div
                class="w-full hover:bg-white/10 flex justify-around cursor-pointer items-center z-25 rounded-lg"
                on:click={toggleFullScreen}
                on:click={() => (menuDrop = !menuDrop)}
                on:click={() => (fullScreen = !fullScreen)}
            >
                {#if $highlightFullScreen}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler cursor-pointer icon-tabler-arrows-maximize"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M5 9l4 0l0 -4" />
                        <path d="M3 3l6 6" />
                        <path d="M5 15l4 0l0 4" />
                        <path d="M3 21l6 -6" />
                        <path d="M19 9l-4 0l0 -4" />
                        <path d="M15 9l6 -6" />
                        <path d="M19 15l-4 0l0 4" />
                        <path d="M15 15l6 6" />
                    </svg>
                    <p class="font-bold cursor-pointer text-white">Untoggle full screen</p>
                {:else}
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler cursor-pointer icon-tabler-arrows-minimize"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        stroke-width="1.5"
                        stroke="#ffffff"
                        fill="none"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                    >
                        <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                        <path d="M16 4l4 0l0 4" />
                        <path d="M14 10l6 -6" />
                        <path d="M8 20l-4 0l0 -4" />
                        <path d="M4 20l6 -6" />
                        <path d="M16 20l4 0l0 -4" />
                        <path d="M14 14l6 6" />
                        <path d="M8 4l-4 0l0 4" />
                        <path d="M4 4l6 6" />
                    </svg>
                    <p class="font-bold cursor-pointer text-white">Toggle full screen</p>
                {/if}
            </div>
        </div>
    </div>
</div>

<!-- </div> -->
<style>
    .border-color {
        border-color: #4156f6;
    }

    .background-color {
        background-color: #4156f6;
    }

    @container (max-width: 767px) {
        .responsive-dimension {
            scale: 0.7;
            position: absolute;
            top: 0;
            left: 0;
        }
    }
</style>
