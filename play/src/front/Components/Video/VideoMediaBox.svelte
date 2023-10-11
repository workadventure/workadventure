<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    import Woka from "../Woka/WokaFromUserId.svelte";
    import { isMediaBreakpointOnly, isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import microphoneOffImg from "../images/microphone-off-blue.png";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { speakerListStore, speakerSelectedStore } from "../../Stores/MediaStore";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import BanReportBox from "./BanReportBox.svelte";
    import { srcObject } from "./utils";

    export let clickable = false;

    export let peer: VideoPeer;
    let streamStore = peer.streamStore;
    let volumeStore = peer.volumeStore;
    let name = peer.userName;
    let backGroundColor = Color.getColorByString(peer.userName);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;
    let constraintStore = peer.constraintsStore;
    let subscribeChangeOutput: Unsubscriber;
    let subscribeStreamStore: Unsubscriber;

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElement;
    let minimized = isMediaBreakpointOnly("md");
    let isMobile = isMediaBreakpointUp("md");

    let destroyed = false;
    let currentDeviceId: string | undefined;

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

    onMount(() => {
        resizeObserver.observe(videoContainer);
        let bypassFirstCall = true;

        subscribeChangeOutput = speakerSelectedStore.subscribe((deviceId) => {
            if (bypassFirstCall) {
                bypassFirstCall = false;
                return;
            }
            if (deviceId != undefined) setAudioOutput(deviceId);
        });

        subscribeStreamStore = streamStore.subscribe(() => {
            // We wait just a little bit to be sure that the subscribe changing the video element is applied BEFORE trying to set the sinkId
            console.log("Speaker will switch in 5 seconds");
            setTimeout(() => {
                if ($speakerSelectedStore != undefined) {
                    console.log("Switching speaker");
                    setAudioOutput($speakerSelectedStore);
                }
            }, 5000);
        });
    });

    onDestroy(() => {
        if (subscribeChangeOutput) subscribeChangeOutput();
        if (subscribeStreamStore) subscribeStreamStore();
        destroyed = true;
    });

    // sinkIdPromise is used to throttle the setSinkId calls
    let sinkIdPromise = Promise.resolve();

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
            console.log("setAudioOutput on already set deviceId. Ignoring call.");
            return;
        }
        currentDeviceId = deviceId;

        // Check HTMLMediaElement.setSinkId() compatibility for browser => https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
        try {
            sinkIdPromise = sinkIdPromise.then(() =>
                videoElement
                    ?.setSinkId?.(deviceId)
                    .then(() => {
                        console.info("Audio output device set to ", deviceId);
                        // Trying to set the stream again after setSinkId is set (for Chrome, according to https://bugs.chromium.org/p/chromium/issues/detail?id=971947&q=setsinkid&can=2)
                        if (videoElement && $streamStore) {
                            videoElement.srcObject = $streamStore;
                        }
                    })
                    .catch((e: unknown) => {
                        if (e instanceof DOMException && e.name === "AbortError") {
                            // An error occurred while setting the sinkId. Let's fallback to default.
                            console.warn("Error setting the audio output device. We fallback to default.");
                            if ($speakerListStore && $speakerListStore.length > 0) {
                                speakerSelectedStore.set($speakerListStore[0].deviceId);
                            } else {
                                console.warn(
                                    "Cannot fall back to default speaker. There is no speakers in the speaker list."
                                );
                                speakerSelectedStore.set(undefined);
                            }
                            return;
                        }
                        console.info("Error setting the audio output device: ", e);
                    })
            );
            console.warn("Setting Sink Id to ", deviceId);
        } catch (err) {
            console.info(
                "Your browser is not compatible for updating your speaker over a video element. Try to change the default audio output in your computer settings. Error: ",
                err
            );
        }
    }
</script>

<div
    class="video-container"
    class:video-off={!videoEnabled}
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
        {#if $streamStore}
            <!-- svelte-ignore a11y-media-has-caption -->
            <video
                bind:this={videoElement}
                class:tw-h-0={!videoEnabled}
                class:tw-w-0={!videoEnabled}
                class:object-contain={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
                class:tw-h-full={videoEnabled}
                class:tw-max-w-full={videoEnabled}
                class:tw-rounded={videoEnabled}
                style={$embedScreenLayoutStore === LayoutMode.Presentation
                    ? `border: solid 2px ${backGroundColor}`
                    : ""}
                use:srcObject={$streamStore}
                autoplay
                playsinline
            />
        {/if}

        {#if videoEnabled}
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
                    class="voice-meter-webcam-container media-box-camera-off-size tw-flex tw-flex-col tw-absolute tw-items-end tw-pr-2"
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
            tw-translate-x-3 tw-transition-all tw-opacity-0"
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
