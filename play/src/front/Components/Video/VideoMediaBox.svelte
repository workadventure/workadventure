<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import CancelablePromise from "cancelable-promise";
    import Debug from "debug";
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { LL } from "../../../i18n/i18n-svelte";

    import Woka from "../Woka/WokaFromUserId.svelte";
    import { isMediaBreakpointOnly, isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import microphoneOffImg from "../images/microphone-off-blue.png";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../Stores/MediaStore";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import BanReportBox from "./BanReportBox.svelte";
    import { srcObject } from "./utils";
    import loaderImg from "../images/loader.svg";

    export let clickable = false;

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

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElement;
    let minimized = isMediaBreakpointOnly("md");
    let isMobile = isMediaBreakpointUp("md");
    let noVideoTimeout: ReturnType<typeof setTimeout> | undefined;

    let destroyed = false;
    let currentDeviceId: string | undefined;

    let displayNoVideoWarning = false;

    const debug = Debug("VideoMediaBox");

    $: videoEnabled = $constraintStore ? $constraintStore.video : false;

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    const resizeObserver = new ResizeObserver(() => {
        minimized = isMediaBreakpointOnly("md");
        isMobile = isMediaBreakpointUp("md");
    });

    // TODO: check the race condition when setting sinkId is solved.
    // Also, read: https://github.com/nwjs/nw.js/issues/4340

    // A promise to chain calls to setSinkId and setting the srcObject
    // setSinkId must be resolved before setting the srcObject. See Chrome bug, according to https://bugs.chromium.org/p/chromium/issues/detail?id=971947&q=setsinkid&can=2
    let sinkIdPromise = CancelablePromise.resolve();

    onMount(() => {
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
</script>

<div
    class="video-container transition-all self-end relative aspect-video w-[350px]"
    class:video-off={!videoEnabled}
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        class="aspect-video w-full absolute top-0 left-0 overflow-hidden z-20 rounded-lg transition-all bg-no-repeat bg-center bg-contrast/80 backdrop-blur rounded-xl mr-4"
        style="background-image: url({loaderImg})"
        class:flex-col={videoEnabled}
        class:h-full={videoEnabled}
        class:items-center={!videoEnabled || $statusStore === "connecting" || $statusStore === "error"}
        class:px-3={!videoEnabled}
        class:rounded={!videoEnabled}
        class:flex-row={!videoEnabled}
        class:relative={!videoEnabled}
        class:justify-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" ></div>
        {:else if $statusStore === "error"}
            <div class="rtc-error" ></div>
        {/if}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            bind:this={videoElement}
            class:h-0={!videoEnabled}
            class:w-0={!videoEnabled}
            class:object-contain={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
            class:h-full={videoEnabled}
            class:max-w-full={videoEnabled}
            class:rounded={videoEnabled}
            autoplay
            playsinline
            class="h-full w-full rounded md:object-cover relative z-20"
        ></video>
        {#if displayNoVideoWarning}
                <div
                    class="tw-flex media-box-camera-on-size tw-absolute tw-justify-center tw-items-center tw-bg-danger/50 tw-text-white"
                >
                    <div class="tw-text-center">
                        <h1>{$LL.video.connection_issue()}</h1>
                        <p>{$LL.video.no_video_stream_received()}</p>
                    </div>
                </div>
            {/if}
            <div class="absolute bottom-4 left-4 z-30">
            <div class="flex">
                    <div class="rounded bg-contrast/90 backdrop-blur flex items-center pl-4 py-1 text-white text-sm pl-12 pr-4 bold">
                        <div class="absolute left-1 -top-1" style="image-rendering:pixelated">
                            <Woka
                                    userId={peer.userId}
                                    placeholderSrc={""}
                                    customHeight="42&& !$cameraEnergySavingStorepx"
                                    customWidth="42px"
                            />
                        </div>
                        {name}
                        <div class="pl-1 mr-3 p-1 rounded hover:bg-white/20">
                            <svg xmlns="http://www.w3.org/2000/svg" class="icon icon-tabler icon-tabler-chevron-down" width="16" height="16" viewBox="0 0 24 24" stroke-width="1.5" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round">
                              <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                              <path d="M6 9l6 6l6 -6" />
                            </svg>
                        </div>
                    </div>
            </div>
        </div>
        {#if videoEnabled}
            <div class="z-[251] absolute aspect-ratio right-4 w-8 bottom-5 p-1 flex items-center justify-center">
            {#if $constraintStore && $constraintStore.audio !== false}
                <SoundMeterWidget volume={$volumeStore} classcss="absolute" barColor="blue" />
            {:else}
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 10.5832 14.8258 10.9145 14.7287 11.2332M12.4788 13.4832C11.9744 13.6361 11.4412 13.6687 10.922 13.5784C10.4028 13.4882 9.9119 13.2776 9.4887 12.9635C9.06549 12.6494 8.72171 12.2406 8.48491 11.7698C8.2481 11.299 8.12484 10.7793 8.125 10.2522V9.12725" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                       <path d="M3.625 10.25C3.62475 11.6713 4.00915 13.0661 4.73742 14.2866C5.46568 15.5071 6.51068 16.5077 7.76159 17.1824C9.01249 17.8571 10.4227 18.1807 11.8426 18.1189C13.2625 18.0571 14.6392 17.6121 15.8267 16.8313M18.0767 14.5813C18.9248 13.2961 19.3756 11.78ƒbtn)97 19.3727 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
            {/if}
            </div>
        {:else}
            {#if $constraintStore && $constraintStore.audio !== false}
                <SoundMeterWidget
                    volume={$volumeStore}
                    classcss="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                    barColor={textColor}
                />
            {:else}
                <img
                    draggable="false"
                    src={microphoneOffImg}
                    class="flex p-1 h-8 w-8 voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                    alt="Mute"
                    class:brightness-0={textColor === "black"}
                    class:brightness-100={textColor === "white"}
                />
            {/if}
            <div class="w-full flex report-ban-container-cam-off opacity-0 h-10">
                <BanReportBox {peer} />
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
</style>
