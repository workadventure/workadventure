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
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { speakerSelectedStore } from "../../Stores/MediaStore";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import BanReportBox from "./BanReportBox.svelte";
    import { srcObject } from "./utils";

    let videoContainer: HTMLDivElement;
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
                videoElement.setSinkId(deviceId);
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
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        style={`border: solid 2px ${backGroundColor}; color: ${textColor}; background-color: ${backGroundColor}; color: ${textColor}`}
        class="items-center px-3 w-full rounded flex flex-row relative"
    >
        <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px" />
        <!-- svelte-ignore a11y-media-has-caption &ndash;&gt;-->
        {#if $streamStore}
            <video
                bind:this={videoElement}
                class="h-0 w-0"
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
            class="font-semibold text-sm not-italic break-words px-2 overflow-y-auto max-h-10">{name}</span
        >
        {#if $constraintStore && $constraintStore.audio !== false}
            <SoundMeterWidget
                volume={$volumeStore}
                classcss="voice-meter-cam-off relative mr-0 ml-auto translate-x-0 transition-transform"
                barColor={textColor}
            />
        {:else}
            <svg draggable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 10.5832 14.8258 10.9145 14.7287 11.2332M12.4788 13.4832C11.9744 13.6361 11.4412 13.6687 10.922 13.5784C10.4028 13.4882 9.9119 13.2776 9.4887 12.9635C9.06549 12.6494 8.72171 12.2406 8.48491 11.7698C8.2481 11.299 8.12484 10.7793 8.125 10.2522V9.12725" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3.625 10.25C3.62475 11.6713 4.00915 13.0661 4.73742 14.2866C5.46568 15.5071 6.51068 16.5077 7.76159 17.1824C9.01249 17.8571 10.4227 18.1807 11.8426 18.1189C13.2625 18.0571 14.6392 17.6121 15.8267 16.8313M18.0767 14.5813C18.9248 13.2961 19.3756 11.78ƒbtn)97 19.3727 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
        {/if}
        <div class="w-full flex report-ban-container-cam-off opacity-0 h-10">
            <BanReportBox {peer} />
        </div>
    </div>
</div>
