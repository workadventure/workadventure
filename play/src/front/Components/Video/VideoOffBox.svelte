<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { Color } from "@workadventure/shared-utils";
    import SoundMeterWidget from "../SoundMeterWidget.svelte";
    import type { VideoPeer } from "../../WebRtc/VideoPeer";
    import Woka from "../Woka/WokaFromUserId.svelte";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import type { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import microphoneOffImg from "../images/microphone-off.png";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { speakerSelectedStore } from "../../Stores/MediaStore";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import BanReportBox from "./BanReportBox.svelte";
    import { srcObject } from "./utils";

    let videoElement: HTMLVideoElement;
    export let peer: VideoPeer;
    export let clickable = false;

    let streamStore = peer.streamStore;
    let name = peer.userName;
    let backGroundColor = Color.getColorByString(peer.userName);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
    let volumeStore = peer.volumeStore;
    let subscribeChangeOutput: Unsubscriber;
    let subscribeStreamStore: Unsubscriber;

    let embedScreen: EmbedScreen;

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    onMount(() => {
        subscribeChangeOutput = speakerSelectedStore.subscribe((deviceId) => {
            if (deviceId != undefined) setAudioOutPut(deviceId);
        });

        subscribeStreamStore = streamStore.subscribe(() => {
            if ($speakerSelectedStore != undefined) setAudioOutPut($speakerSelectedStore);
        });
    });

    onDestroy(() => {
        if (subscribeChangeOutput) subscribeChangeOutput();
        if (subscribeStreamStore) subscribeStreamStore();
    });

    //sets the ID of the audio device to use for output
    function setAudioOutPut(deviceId: string) {
        // Check HTMLMediaElement.setSinkId() compatibility for browser => https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
        try {
            // @ts-ignore
            if (videoElement != undefined && videoElement.setSinkId != undefined) {
                // @ts-ignore
                videoElement.setSinkId(deviceId).catch((e) => {
                    console.info("Error setting the audio output device: ", e);
                });
                console.warn("Setting Sink Id to ", deviceId);
            }
        } catch (err) {
            console.info(
                "Your browser is not compatible for updating your speaker over a video element. Try to change the default audio output in your computer settings. Error: ",
                err
            );
        }
    }

    let constraintStore = peer.constraintsStore;
</script>

<div
    class="video-container video-off"
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        style={`border: solid 2px ${backGroundColor}; color: ${textColor}; background-color: ${backGroundColor}; color: ${textColor}`}
        class="tw-items-center tw-px-3 tw-w-full tw-rounded tw-flex tw-flex-row tw-relative"
    >
        <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
        <!-- svelte-ignore a11y-media-has-caption -->
        {#if $streamStore}
            <video
                bind:this={videoElement}
                class="tw-h-0 tw-w-0"
                style={$embedScreenLayoutStore === LayoutMode.Presentation
                    ? `border: solid 2px ${backGroundColor}`
                    : ""}
                use:srcObject={$streamStore}
                autoplay
                playsinline
            />
        {/if}
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
    </div>
</div>
