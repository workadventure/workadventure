<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import type { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import { srcObject } from "./utils";
    import BanReportBox from "./BanReportBox.svelte";
    import { onMount } from "svelte";

    export let clickable = false;

    export let peer: ScreenSharingPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let backGroundColor = Color.getColorByString(peer.userName);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;
    let isHighlighted = false;
    // let constraintStore = peer.constraintsStore;

    let embedScreen: Streamable;

    $: videoEnabled = $streamStore ? $streamStore.getVideoTracks().length > 0 : false;

    if (peer) {
        embedScreen = peer as unknown as Streamable;
    }

    onMount(() => {
        console.log("MOUNTED SCRREEN SHARING MEDIA BOX");
        embedScreen = peer;
        console.log("embedScreen", embedScreen);
        console.log("statusStore", $statusStore);
    });

    function highlight() {
        highlightedEmbedScreen.toggleHighlight(embedScreen);
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div class="video-container h-full w-full relative screen-sharing" on:click={highlight}>
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    {#if $streamStore !== null}
        <video
            use:srcObject={$streamStore}
            autoplay
            playsinline
            class="w-full h-full mx-auto rounded object-contain"
            muted
        />
        <i class="flex">
            <span
                style="background-color: {backGroundColor}; color: {textColor};"
                class="nametag-text nametag-shape pr-3 pl-2 h-3 max-h-8">{name}</span
            >
        </i>
    {/if}

    <BanReportBox {peer} />
</div>
<!-- on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)} -->

<!-- nametag-screenshare-container container-end flex media-box-camera-on-size -->
<!-- For DIV above i-->

<!-- <div
        class="report-ban-screenshare-container flex video-on-responsive-height media-box-camera-on-position media-box-screensharing-size
        z-[600] flex opacity-0 translate-x-0 transition-all"
    > -->

<!-- For div above BAN REPORT -->
<style>
    /* @container (max-width: 767px) {
        .video-container {
            scale: 0.5;
        }
    }

    @container (min-width: 768px) and (max-width: 1023px) {
        .video-container {
            scale: 0.8;
        }
    }

    @container (min-width: 1440px) and (max-width: 1919px) {
        .video-container {
            scale: 0.6;
        }
    } */

    /* @container (min-width: 1920px) {
        .video-container {
            scale: 1;
        }
    } */
</style>
