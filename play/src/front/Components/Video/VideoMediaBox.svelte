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

    import Woka from "../Woka/WokaFromUserId.svelte";
    import { isMediaBreakpointOnly, isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import microphoneOffImg from "../images/microphone-off-blue.png";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { selectDefaultSpeaker, speakerSelectedStore } from "../../Stores/MediaStore";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
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

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElement;
    let minimized = isMediaBreakpointOnly("md");
    let isMobile = isMediaBreakpointUp("md");

    let destroyed = false;
    let currentDeviceId: string | undefined;

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
    });

    onDestroy(() => {
        if (unsubscribeChangeOutput) unsubscribeChangeOutput();
        if (unsubscribeStreamStore) unsubscribeStreamStore();
        destroyed = true;
        sinkIdPromise.cancel();
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
    class="video-container"
    class:video-off={!videoEnabled}
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        class="flex w-full bg-contrast/80 backdrop-blur"
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
        {:else if !videoEnabled}
            <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
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
        ></video>

        {#if videoEnabled}
            <div class="nametag-webcam-container container-end media-box-camera-on-size video-on-responsive-height">
                <i class="flex">
                    <span
                        class="nametag-text nametag-shape pr-3 pl-5 h-4 max-h-8">{name}</span
                    >
                </i>
            </div>
            <div class="woka-webcam-container container-end video-on-responsive-height pb-1 left-0">
                <div
                    class="flex {($constraintStore && $constraintStore.video !== false) || minimized
                        ? ''
                        : 'no-video'}"
                >
                    <Woka userId={peer.userId} placeholderSrc={""} customHeight="20px" customWidth="20px" />
                </div>
            </div>
            {#if $constraintStore && $constraintStore.audio !== false}
                <div
                    class="voice-meter-webcam-container media-box-camera-off-size flex flex-col absolute items-end pr-2"
                >
                    <SoundMeterWidget volume={$volumeStore} classcss="absolute" barColor="blue" />
                </div>
            {:else}
                <div
                    class="voice-meter-webcam-container media-box-camera-off-size flex flex-col absolute items-end pr-2"
                >
                    <img draggable="false" src={microphoneOffImg} class="flex p-1 h-8 w-8" alt="Mute" />
                </div>
            {/if}
            <div
                class="report-ban-container flex z-[600] media-box-camera-on-size media-box-camera-on-position
            translate-x-3 transition-all opacity-0"
            >
                <BanReportBox {peer} />
            </div>
        {:else}
            <span
                style={$embedScreenLayoutStore === LayoutMode.VideoChat
                    ? `background-color: ${backGroundColor}; color: ${textColor}`
                    : ""}
                class="font-semibold text-sm not-italic break-words px-2 overflow-y-auto max-h-10"
                >{name}</span
            >
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
