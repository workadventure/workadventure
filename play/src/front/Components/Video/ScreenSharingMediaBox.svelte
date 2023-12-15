<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    import type { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import { srcObject } from "./utils";
    import BanReportBox from "./BanReportBox.svelte";

    export let clickable = false;

    export let peer: ScreenSharingPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let backGroundColor = Color.getColorByString(peer.userName);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;

    let embedScreen: EmbedScreen;

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }
</script>

<div
    class="video-container screen-sharing tw-flex tw-w-full tw-flex-col tw-h-full"
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
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
            class="tw-h-full tw-max-w-full tw-mx-auto tw-rounded"
            muted
        />
        <div
            class="nametag-screenshare-container container-end tw-flex media-box-camera-on-size video-on-responsive-height"
        >
            <i class="flex">
                <span
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="nametag-text nametag-shape tw-pr-3 tw-pl-2 tw-h-3 tw-max-h-8">{name}</span
                >
            </i>
        </div>
    {/if}
    <div
        class="report-ban-screenshare-container tw-flex video-on-responsive-height media-box-camera-on-position media-box-screensharing-size
        tw-z-[600] tw-flex tw-opacity-0 tw-translate-x-0 tw-transition-all"
    >
        <BanReportBox {peer} />
    </div>
</div>
