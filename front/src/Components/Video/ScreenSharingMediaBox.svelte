<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    import type { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import { getColorByString, srcObject, getTextColorByBackgroundColor } from "./utils";
    import BanReportBox from "./BanReportBox.svelte";

    export let clickable = false;

    export let peer: ScreenSharingPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let backGroundColor = getColorByString(peer.userName);
    let textColor = getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;

    let embedScreen: EmbedScreen;

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }
</script>

<div class="video-container screen-sharing screen-blocker tw-flex tw-w-full tw-flex-col tw-h-full">
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    {#if $streamStore !== null}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
            use:srcObject={$streamStore}
            autoplay
            playsinline
            on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
            class="tw-h-full tw-max-w-full tw-mx-auto tw-rounded"
        />
        <div
            class="nametag-screenshare-container container-end tw-flex media-box-camera-on-size video-on-responsive-height"
            on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
        >
            <i class="flex">
                <span
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="nametag-text tw-rounded-tr-lg tw-pr-3 tw-pl-5 tw-h-3 tw-max-h-8 tw-overflow-auto tw-max-w-full"
                    >{name}</span
                >
            </i>
        </div>
    {/if}
    <div
        class="report-ban-container tw-flex video-on-responsive-height media-box-camera-on-position
        tw-z-[600] tw-flex tw-h-32 2xl:tw-h-48 2xl:tw-w-96 tw-translate-x-3 tw-transition-all tw-opacity-0">
        <BanReportBox {peer} />
    </div>
</div>

<style lang="scss">
  .video-container {
        i {
            white-space: nowrap;
            span {
                padding: 2px 32px;
            }
        }
    }
</style>
