<script lang="ts">
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import VideoMediaBox from "./VideoMediaBox.svelte";
    import ScreenSharingMediaBox from "./ScreenSharingMediaBox.svelte";
    import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import LocalStreamMediaBox from "./LocalStreamMediaBox.svelte";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import VideoOffBox from "./VideoOffBox.svelte";

    export let streamable: Streamable;
    export let isHightlighted = false;
    export let isClickable = false;
    export let mozaicSolo = false;
    export let mozaicFullWidth = false;
    export let mozaicQuarter = false;

    let peer = streamable;
    let constraintStore = peer.constraintsStore;
</script>

{#if streamable instanceof VideoPeer}
    {#if $constraintStore && !$constraintStore.video}
        <div
            class="media-container {isHightlighted
                ? 'hightlighted tw-max-w-sm tw-mx-auto'
                : 'tw-flex tw-m-auto tw-flex tw-w-56 sm:tw-w-80 md:tw-w-36 lg:tw-w-44 xl:tw-w-64 2xl:tw-w-96 tw-h-10'}
     tw-m-0 tw-p-0 tw-bg-dark-blue/50 tw-rounded
"
            class:clickable={isClickable}
            class:mozaic-solo={mozaicSolo}
            class:mozaic-full-width={mozaicFullWidth}
            class:mozaic-quarter={mozaicQuarter}
        >
            <div class="{isHightlighted ? 'tw-mr-6' : 'tw-mx-auto'} tw-w-full tw-flex">
                <VideoOffBox peer={streamable} clickable={false} />
            </div>
        </div>
    {:else}
        <div
            class="media-container {isHightlighted
                ? 'hightlighted tw-mr-6'
                : 'tw-flex tw-h-32 tw-w-56 sm:tw-h-48 sm:tw-w-80 md:tw-h-20 md:tw-w-36 lg:tw-h-24 lg:tw-w-44 xl:tw-h-36 xl:tw-w-64 2xl:tw-h-48 2xl:tw-w-96'}
     tw-m-0 tw-p-0 tw-bg-dark-blue/50 tw-rounded
"
            class:clickable={isClickable}
            class:mozaic-solo={mozaicSolo}
            class:mozaic-full-width={mozaicFullWidth}
            class:mozaic-quarter={mozaicQuarter}
        >
            <div class="{isHightlighted ? 'tw-h-[32vw] tw-mr-6' : 'tw-mx-auto'} tw-w-full tw-flex">
                <VideoMediaBox peer={streamable} clickable={isClickable} />
            </div>
        </div>
    {/if}
{:else if streamable instanceof ScreenSharingPeer}
    <div
        class="media-container {isHightlighted
            ? 'hightlighted tw-mr-6'
            : 'tw-flex tw-h-32 tw-w-56 sm:tw-h-48 sm:tw-w-80 md:tw-h-20 md:tw-w-36 lg:tw-h-24 lg:tw-w-44 xl:tw-h-36 xl:tw-w-64 2xl:tw-h-48 2xl:tw-w-96'}
     tw-m-0 tw-p-0 tw-bg-dark-blue/50 tw-rounded
"
        class:clickable={isClickable}
        class:mozaic-solo={mozaicSolo}
        class:mozaic-full-width={mozaicFullWidth}
        class:mozaic-quarter={mozaicQuarter}
    >
        <div class="{isHightlighted ? 'tw-h-[41vw] tw-mr-6' : 'tw-mx-auto'}   tw-w-full tw-h-full tw-flex">
            <ScreenSharingMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div>
{:else}
    <div
        class="media-container {isHightlighted
            ? 'hightlighted tw-mr-6'
            : 'tw-flex tw-h-32 tw-w-56 sm:tw-h-48 sm:tw-w-80 md:tw-h-20 md:tw-w-36 lg:tw-h-24 lg:tw-w-44 xl:tw-h-36 xl:tw-w-64 2xl:tw-h-48 2xl:tw-w-96'}
     tw-m-0 tw-p-0 tw-bg-dark-blue/50 tw-rounded
"
        class:clickable={isClickable}
        class:mozaic-solo={mozaicSolo}
        class:mozaic-full-width={mozaicFullWidth}
        class:mozaic-quarter={mozaicQuarter}
    >
        <div class="{isHightlighted ? 'tw-h-[41vw] tw-mr-6' : 'tw-mx-auto'}   tw-w-full tw-h-full tw-flex">
            <LocalStreamMediaBox peer={streamable} clickable={isClickable} cssClass="" />
        </div>
    </div>
{/if}

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    .media-container {
        transition: margin-left 0.2s, margin-right 0.2s, margin-bottom 0.2s, margin-top 0.2s, max-height 0.2s,
            max-width 0.2s;
        pointer-events: auto;

        padding: 0;

        &:hover {
            margin-top: 2%;
            margin-bottom: 2%;
        }
    //
    //    &.mozaic-solo {
    //        max-height: inherit !important;
    //        width: 90% !important;
    //    }
    //
    //    &.mozaic-full-width {
    //        width: 95%;
    //        max-width: 95%;
    //        margin-left: 3%;
    //        margin-right: 3%;
    //        margin-top: auto;
    //        margin-bottom: auto;
    //        max-height: 95%;
    //
    //        &:hover {
    //            margin-top: auto;
    //            margin-bottom: auto;
    //        }
    //    }
    //
    //    &.mozaic-quarter {
    //        width: 95%;
    //        max-width: 95%;
    //        margin-top: auto;
    //        margin-bottom: auto;
    //        max-height: 95%;
    //
    //        &:hover {
    //            margin-top: auto;
    //            margin-bottom: auto;
    //        }
    //    }
    //
    //    &.nes-container.is-rounded {
    //        border-image-outset: 1;
    //    }
    //
        &.clickable {
            cursor: url("../../../style/images/cursor_pointer.png"), pointer;
        }
    }
</style>
