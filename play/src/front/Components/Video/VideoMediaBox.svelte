<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import CancelablePromise from "cancelable-promise";
    import Debug from "debug";
    import { fly } from "svelte/transition";
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { LL } from "../../../i18n/i18n-svelte";

    import Woka from "../Woka/WokaFromUserId.svelte";
    import { isMediaBreakpointOnly } from "../../Utils/BreakpointsUtils";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../Stores/MediaStore";
    import { embedScreenLayoutStore, heightCamWrapper } from "../../Stores/EmbedScreensStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import loaderImg from "../images/loader.svg";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import FullScreenIcon from "../Icons/FullScreenIcon.svelte";
    import BusinessCardIcon from "../Icons/BusinessCardIcon.svelte";
    import VolumeIcon from "../Icons/VolumeIcon.svelte";
    import FlagIcon from "../Icons/FlagIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import MessageCircleIcon from "../Icons/MessageCircleIcon.svelte";
    import ActionMediaBox from "./ActionMediaBox.svelte";

    // Extend the HTMLVideoElement interface to add the setSinkId method.
    // See https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
    interface HTMLVideoElementExt extends HTMLVideoElement {
        setSinkId?(deviceId: string): Promise<void>;
        requestVideoFrameCallback(callback: VideoFrameRequestCallback, options?: IdleRequestOptions): number;
    }

    export let clickable = false;
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
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElementExt;
    let minimized = isMediaBreakpointOnly("md");
    let noVideoTimeout: ReturnType<typeof setTimeout> | undefined;

    let destroyed = false;
    let currentDeviceId: string | undefined;

    let displayNoVideoWarning = false;

    let showUserSubMenu = false;

    let aspectRatio = 1;

    let isHighlighted = false;

    const debug = Debug("VideoMediaBox");

    // function getSize() {
    //     otherCamWidth = (document.getElementsByClassName("video-container")[0] as HTMLElement)?.offsetWidth;
    //     console.log("JE SUIS DANS GETSIZE", otherCamWidth, typeof otherCamWidth);
    //     totalOtherCamWidth += otherCamWidth;
    //     console.log("HELLO", totalOtherCamWidth, typeof totalOtherCamWidth);
    // }

    $: videoEnabled = $constraintStore ? $constraintStore.video : false;

    // if (peer) {
    //     embedScreen = {
    //         type: "streamable",
    //         embed: peer as unknown as Streamable,
    //     };
    // }

    const resizeObserver = new ResizeObserver(() => {
        minimized = isMediaBreakpointOnly("md");
    });

    // TODO: check the race condition when setting sinkId is solved.
    // Also, read: https://github.com/nwjs/nw.js/issues/4340

    // A promise to chain calls to setSinkId and setting the srcObject
    // setSinkId must be resolved before setting the srcObject. See Chrome bug, according to https://bugs.chromium.org/p/chromium/issues/detail?id=971947&q=setsinkid&can=2
    let sinkIdPromise = CancelablePromise.resolve();

    onMount(() => {
        // getSize();
        resizeObserver.observe(videoContainer);

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
            updateRatio();
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
            if (!wasVideoEnabled && isHightlighted) highlightedEmbedScreen.toggleHighlight(embedScreen);
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

    //Cette fonction permet de mettre en évidence la video des autres utilisateurs ne fonctionne pas pour le moment

    $: isHighlighted = $highlightedEmbedScreen === peer;

    function highlight() {
        highlightedEmbedScreen.toggleHighlight(peer);
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!-- class="video-container transition-all relative h-full aspect-video" -->

<!-- Dans la premiere div     style="height:{$heightCamWrapper}px;"-->
<div
    class="video-container transition-all h-full w-full relative aspect-video"
    class:isHighlighted
    class:video-off={!videoEnabled}
    class:h-full={$embedScreenLayoutStore === LayoutMode.VideoChat}
    bind:this={videoContainer}
    on:click={() => analyticsClient.pinMeetingAction()}
    on:click={highlight}
>
    <ActionMediaBox {embedScreen} trackStreamWraper={peer} {videoEnabled} />

    <div
        class="aspect-video absolute top-0 left-0 z-20 rounded-lg transition-all bg-no-repeat bg-center bg-contrast/80 backdrop-blur"
        style="background-image: url({loaderImg})"
        class:flex-col={videoEnabled}
        class:h-full={videoEnabled}
        class:items-center={!videoEnabled || $statusStore === "connecting" || $statusStore === "error"}
        class:px-7={!videoEnabled}
        class:flex-row={!videoEnabled}
        class:relative={!videoEnabled}
        class:justify-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" />
        {:else if $statusStore === "error"}
            <div class="rtc-error" />
        {/if}
        <!-- svelte-ignore a11y-media-has-caption -->

        <!-- Dans la video class:max-h-[230px]={videoEnabled && !isHightlighted}-->
        <video
            bind:this={videoElement}
            class:h-0={!videoEnabled}
            class:w-0={!videoEnabled}
            class:object-contain={minimized || isHightlighted || aspectRatio < 1}
            class:max-h-full={videoEnabled && !isHightlighted && $embedScreenLayoutStore === LayoutMode.VideoChat}
            class:max-h-[80vh]={videoEnabled && isHightlighted}
            class:h-full={videoEnabled}
            class:rounded-lg={videoEnabled}
            autoplay
            playsinline
        />

        {#if videoEnabled}
            {#if displayNoVideoWarning}
                <div
                    class="absolute w-full h-full top-0 left-0 flex justify-center items-center bg-danger/50 text-white"
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
            <div class="absolute bottom-4 left-4 z-30">
                <div class="flex">
                    <div
                        class="relative rounded bg-contrast/90 backdrop-blur px-4 py-1 text-white text-sm pl-12 pr-9 bold"
                    >
                        <div class="absolute left-1 -top-1 z-30" style="image-rendering:pixelated">
                            <Woka
                                userId={peer.userId}
                                placeholderSrc={""}
                                customHeight="42&& !$cameraEnergySavingStorepx"
                                customWidth="42px"
                            />
                        </div>
                        {name}
                        <div
                            class="p-1 rounded-sm hover:bg-white/20 absolute right-0 top-0 bottom-0 m-auto h-6 w-6 mr-1 transition-all pointer-events-auto {showUserSubMenu
                                ? 'bg-white/20 hover:bg-white/30'
                                : ''}"
                            on:click={() => (showUserSubMenu = !showUserSubMenu)}
                        >
                            <ChevronDownIcon
                                strokeWidth="2.5"
                                height="h-4"
                                width="w-4"
                                classList="aspect-ratio transition-all {showUserSubMenu ? 'rotate-180' : ''}"
                            />
                        </div>
                        {#if showUserSubMenu}
                            <div
                                class="rounded bg-contrast/80 justify-right font-normal py-1 absolute z-20 mt-1.5 right-0 text-right w-36 overflow-hidden"
                                transition:fly={{ y: -25, duration: 50 }}
                            >
                                <div class="flex items-center px-4 py-1 hover:bg-white/10">
                                    <FullScreenIcon height="h-4" width="w-4" />
                                    <div class="pl-2">Show wide</div>
                                    <!-- trans -->
                                </div>
                                <div class="flex items-center px-4 py-1 hover:bg-white/10">
                                    <BusinessCardIcon height="h-4" width="w-4" />
                                    <div class="pl-2">Business card</div>
                                    <!-- trans -->
                                </div>
                                <div class="flex items-center px-4 py-1 hover:bg-white/10">
                                    <MessageCircleIcon height="h-4" width="w-4" />
                                    <div class="pl-2">Send message</div>
                                    <!-- trans -->
                                </div>
                                <div class="flex items-center px-4 py-1 hover:bg-white/10">
                                    <VolumeIcon height="h-4" width="w-4" />
                                    <div class="pl-2">Volume</div>
                                    <!-- trans -->
                                </div>
                                <div class="flex items-center px-4 py-1 hover:bg-white/10">
                                    <MicOffIcon height="h-4" width="w-4" />
                                    <div class="pl-2">Mute</div>
                                    <!-- trans -->
                                </div>
                                <div class="flex items-center px-4 py-1 hover:bg-danger">
                                    <FlagIcon height="h-4" width="w-4" />
                                    <div class="pl-2">Report user</div>
                                    <!-- trans -->
                                </div>
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
            <div
                class="z-[251] absolute aspect-ratio right-3 w-8 p-1 flex items-center justify-center {$constraintStore &&
                $constraintStore.audio !== false
                    ? 'bottom-4'
                    : 'bottom-3'}"
            >
                {#if $constraintStore && $constraintStore.audio !== false}
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
</div>

<style lang="scss">
    video {
        object-fit: cover;
        &.object-contain {
            object-fit: contain;
        }
    }

    .isHighlighted {
        height: 100%;
        width: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
    }
</style>
