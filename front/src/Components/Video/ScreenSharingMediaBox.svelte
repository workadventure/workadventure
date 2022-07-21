<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    import type { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import { getColorByString, srcObject, getTextColorByBackgroundColor } from "./utils";

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
            class="nametag-screenshare-container tw-flex tw-flex-col tw-absolute tw-justify-end
tw-flex tw-h-32 tw-w-56 sm:tw-h-48 sm:tw-w-80 md:tw-h-20 md:tw-w-36 lg:tw-h-24 lg:tw-w-44 xl:tw-h-36 xl:tw-w-64 2xl:tw-h-48 2xl:tw-w-96
tw-h-32 sm:tw-h-48 md:tw-h-20 lg:tw-h-24 xl:tw-h-36 2xl:tw-h-48
"
            on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
        >
            <i class="flex">
                <span
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="tw-rounded-tr-lg tw-pr-3 tw-pl-8 lg:tw-py-1 tw-font-semibold tw-text-sm lg:tw-text-base tw-not-italic"
                    >{name}</span
                >
            </i>
        </div>
    {/if}
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
