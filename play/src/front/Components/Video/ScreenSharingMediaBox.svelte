<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    import type { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import { scriptUtils } from "../../Api/ScriptUtils";
    import { hiddenStore } from "../../Stores/VisibilityStore";
    import { srcObject } from "./utils";
    import BanReportBox from "./BanReportBox.svelte";

    export let clickable = false;
    export let peer: ScreenSharingPeer;

    let streamStore = peer.streamStore;
    let name = peer.player.name;
    let backGroundColor = Color.getColorByString(peer.player.name);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;
    let videoElement: HTMLVideoElement;

    let embedScreen: EmbedScreen;

    let unsubscribeHidenStore: Unsubscriber | undefined;

    if (peer) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }

    onMount(() => {
        unsubscribeHidenStore = hiddenStore.subscribe((value) => {
            if (value) {
                scriptUtils.startPictureInpictureMode(videoElement);
            } else {
                scriptUtils.exitPictureInpictureMode();
            }
        });
    });

    onDestroy(() => {
        if (unsubscribeHidenStore) unsubscribeHidenStore();
    });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
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
            bind:this={videoElement}
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
        tw-z-[600] tw-opacity-0 tw-translate-x-0 tw-transition-all"
    >
        <BanReportBox {peer} />
    </div>
</div>
