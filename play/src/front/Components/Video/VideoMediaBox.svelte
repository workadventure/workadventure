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
    import { isMediaBreakpointOnly } from "../../Utils/BreakpointsUtils";
    // @ts-ignore
    import microphoneOffImg from "../images/microphone-off.png";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../Stores/MediaStore";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import BanReportBox from "./BanReportBox.svelte";

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

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElementExt;
    let minimized = isMediaBreakpointOnly("md");
    let noVideoTimeout: ReturnType<typeof setTimeout> | undefined;

    let destroyed = false;
    let currentDeviceId: string | undefined;

    let displayNoVideoWarning = false;

    let aspectRatio = 1;

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
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="video-container"
    class:video-off={!videoEnabled}
    class:tw-h-full={videoEnabled && !isHightlighted && $embedScreenLayoutStore === LayoutMode.VideoChat}
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        style={videoEnabled
            ? ""
            : `border: solid 2px ${backGroundColor}; color: ${textColor}; background-color: ${backGroundColor}; color: ${textColor}`}
        class="tw-flex tw-w-full "
        class:tw-flex-col={videoEnabled}
        class:tw-h-full={videoEnabled}
        class:tw-items-center={!videoEnabled || $statusStore === "connecting" || $statusStore === "error"}
        class:tw-px-3={!videoEnabled}
        class:tw-rounded={!videoEnabled}
        class:tw-flex-row={!videoEnabled}
        class:tw-relative={!videoEnabled}
        class:tw-justify-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" />
        {:else if $statusStore === "error"}
            <div class="rtc-error" />
        {:else if !videoEnabled}
            <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
        {/if}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            bind:this={videoElement}
            class:tw-h-0={!videoEnabled}
            class:tw-w-0={!videoEnabled}
            class:object-contain={minimized || isHightlighted || aspectRatio < 1}
            class:tw-max-h-[230px]={videoEnabled && !isHightlighted}
            class:tw-max-h-full={videoEnabled && !isHightlighted && $embedScreenLayoutStore === LayoutMode.VideoChat}
            class:tw-max-h-[80vh]={videoEnabled && isHightlighted}
            class:tw-h-full={videoEnabled}
            class:tw-rounded={videoEnabled}
            style={$embedScreenLayoutStore === LayoutMode.Presentation ? `border: solid 2px ${backGroundColor}` : ""}
            autoplay
            playsinline
        />

        {#if videoEnabled}
            {#if displayNoVideoWarning}
                <div
                    class="tw-flex media-box-camera-on-size tw-absolute tw-w-full tw-h-full ntw-justify-center tw-items-center tw-bg-danger/50 tw-text-white"
                >
                    <div class="tw-text-center">
                        <h1>{$LL.video.connection_issue()}</h1>
                        <p>{$LL.video.no_video_stream_received()}</p>
                    </div>
                </div>
            {/if}
            <div class="nametag-webcam-container container-end media-box-camera-on-size video-on-responsive-height">
                <i class="tw-flex">
                    <span
                        style="background-color: {backGroundColor}; color: {textColor};"
                        class="nametag-text nametag-shape tw-pr-3 tw-pl-5 tw-h-4 tw-max-h-8">{name}</span
                    >
                </i>
            </div>
            <div class="woka-webcam-container container-end video-on-responsive-height tw-pb-1 tw-left-0">
                <div
                    class="tw-flex {($constraintStore && $constraintStore.video !== false) || minimized
                        ? ''
                        : 'no-video'}"
                >
                    <Woka userId={peer.userId} placeholderSrc={""} customHeight="20px" customWidth="20px" />
                </div>
            </div>
            {#if $constraintStore && $constraintStore.audio !== false}
                <div
                    class="voice-meter-webcam-container media-box-camera-off-size tw-flex tw-flex-col tw-absolute tw-items-end tw-pr-2 tw-w-full"
                >
                    <SoundMeterWidget volume={$volumeStore} classcss="tw-absolute" barColor="blue" />
                </div>
            {:else}
                <div
                    class="voice-meter-webcam-container media-box-camera-off-size tw-flex tw-flex-col tw-absolute tw-items-end tw-pr-2"
                >
                    <img draggable="false" src={microphoneOffImg} class="tw-flex tw-p-1 tw-h-8 tw-w-8" alt="Mute" />
                </div>
            {/if}
            <div
                class="report-ban-container tw-flex tw-z-[600] media-box-camera-on-size media-box-camera-on-position
            tw-translate-x-3 tw-transition-all tw-opacity-0 tw-w-full tw-h-full"
            >
                <BanReportBox {peer} />
            </div>
        {:else}
            <span
                style={$embedScreenLayoutStore === LayoutMode.VideoChat
                    ? `background-color: ${backGroundColor}; color: ${textColor}`
                    : ""}
                class="tw-font-semibold tw-text-sm tw-not-italic tw-break-words tw-px-2 tw-overflow-y-auto tw-max-h-10"
                >{name}</span
            >
            {#if $constraintStore && $constraintStore.audio !== false}
                <SoundMeterWidget
                    volume={$volumeStore}
                    classcss="voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                    barColor={textColor}
                />
            {:else}
                <img
                    draggable="false"
                    src={microphoneOffImg}
                    class="tw-flex tw-p-1 tw-h-8 tw-w-8 voice-meter-cam-off tw-relative tw-mr-0 tw-ml-auto tw-translate-x-0 tw-transition-transform"
                    alt="Mute"
                    class:tw-brightness-0={textColor === "black"}
                    class:tw-brightness-100={textColor === "white"}
                />
            {/if}
            <div class="tw-w-full tw-flex report-ban-container-cam-off tw-opacity-0 tw-h-10">
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
