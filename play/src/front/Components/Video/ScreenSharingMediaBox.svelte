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

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="video-container screen-sharing flex w-full flex-col h-full"
    style="height:192px;"
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    {#if $streamStore !== null}
        <video use:srcObject={$streamStore} autoplay playsinline class="h-full max-w-full mx-auto rounded" muted />
        <div
            class="nametag-screenshare-container container-end flex media-box-camera-on-size video-on-responsive-height"
        >
            <i class="flex">
                <span
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="nametag-text nametag-shape pr-3 pl-2 h-3 max-h-8">{name}</span
                >
            </i>
        </div>
    {/if}
    <div
        class="report-ban-screenshare-container flex video-on-responsive-height media-box-camera-on-position media-box-screensharing-size
        z-[600] flex opacity-0 translate-x-0 transition-all"
    >
        <BanReportBox {peer} />
    </div>
</div>
