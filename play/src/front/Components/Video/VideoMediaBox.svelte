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
    import { speakerSelectedStore } from "../../Stores/MediaStore";
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
    let subscribeChangeOutput: Unsubscriber;
    let subscribeStreamStore: Unsubscriber;

    let embedScreen: EmbedScreen;
    let videoContainer: HTMLDivElement;
    let videoElement: HTMLVideoElement;
    let minimized = isMediaBreakpointOnly("md");
    let isMobile = isMediaBreakpointUp("md");

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

    onMount(() => {
        resizeObserver.observe(videoContainer);
        subscribeChangeOutput = speakerSelectedStore.subscribe((deviceId) => {
            if (deviceId != undefined) setAudioOutput(deviceId);
        });

        subscribeStreamStore = streamStore.subscribe(() => {
            if ($speakerSelectedStore != undefined) setAudioOutput($speakerSelectedStore);
        });
    });

    onDestroy(() => {
        if (subscribeChangeOutput) subscribeChangeOutput();
        if (subscribeStreamStore) subscribeStreamStore();
    });

    //sets the ID of the audio device to use for output
    function setAudioOutput(deviceId: string) {
        // Check HTMLMediaElement.setSinkId() compatibility for browser => https://developer.mozilla.org/en-US/docs/Web/API/HTMLMediaElement/setSinkId
        try {
            // @ts-ignore
            if (videoElement != undefined && videoElement.setSinkId != undefined) {
                // @ts-ignore
                videoElement.setSinkId(deviceId).catch((e) => {
                    console.info("Error setting the audio output device: ", e);
                });
            }
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
    bind:this={videoContainer}
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    <div
        class="transition-all self-end relative aspect-video w-[350px]"
        class:justify-center={$statusStore === "connecting" || $statusStore === "error"}
        class:items-center={$statusStore === "connecting" || $statusStore === "error"}
    >
        {#if $statusStore === "connecting"}
            <div class="connecting-spinner" />
        {:else if $statusStore === "error"}
            <div class="rtc-error" />
        {/if}
        <!-- svelte-ignore a11y-media-has-caption -->
        {#if $streamStore}
            <div class="aspect-video w-full absolute top-0 left-0 overflow-hidden z-20 rounded-lg transition-all bg-no-repeat bg-center bg-contrast/80 backdrop-blur rounded-xl" style="background-image: url({loaderImg})">
                <video
                        bind:this={videoElement}
                        class:no-video={!$constraintStore || $constraintStore.video === false}
                        class:object-contain={isMobile || $embedScreenLayoutStore === LayoutMode.VideoChat}
                        class="h-full w-full rounded md:object-cover relative z-20"
                        use:srcObject={$streamStore}
                        autoplay
                        playsinline
                ></video>
                <div class="z-[251] absolute aspect-ratio right-4 w-8 bottom-5 p-1 flex items-center justify-center">
                    {#if $constraintStore && $constraintStore.audio !== false}
                        <div class="aspect-video flex flex-col absolute items-end pr-2">
                            <SoundMeterWidget volume={$volumeStore} classcss="absolute" barColor="white" />
                        </div>
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
            </div>
        {/if}

        <div class="absolute bottom-4 left-4 z-30">
            <div class="flex">
                    <span class="rounded bg-contrast/90 backdrop-blur px-4 py-1 text-white text-sm pl-12 pr-4 bold">
                        <div class="absolute left-1 -top-1" style="image-rendering:pixelated">
                            <Woka
                                    userId={peer.userId}
                                    placeholderSrc={""}
                                    customHeight="42&"
                                    customWidth="42px"
                            />
                        </div>
                        {name}
                    </span>
            </div>
        </div>
        <div
            class="report-ban-container flex z-[600] media-box-camera-on-size media-box-camera-on-position
            translate-x-3 transition-all opacity-0"
        >
            <BanReportBox {peer} />
        </div>
    </div>
</div>

<style lang="scss">
    video.no-video {
        visibility: collapse;
    }

    video {
        object-fit: cover;
        &.object-contain {
            object-fit: contain;
        }
    }
</style>
