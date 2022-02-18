<script lang="ts">
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import VideoMediaBox from "./VideoMediaBox.svelte";
    import ScreenSharingMediaBox from "./ScreenSharingMediaBox.svelte";
    import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import LocalStreamMediaBox from "./LocalStreamMediaBox.svelte";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";

    export let streamable: Streamable;
    export let isHightlighted = false;
    export let isClickable = false;
    export let mozaicSolo = false;
    export let mozaicFullWidth = false;
    export let mozaicQuarter = false;
</script>

<div
    class="media-container nes-container is-rounded {isHightlighted ? 'hightlighted' : ''}"
    class:clickable={isClickable}
    class:mozaic-solo={mozaicSolo}
    class:mozaic-full-width={mozaicFullWidth}
    class:mozaic-quarter={mozaicQuarter}
>
    <div>
        {#if streamable instanceof VideoPeer}
            <VideoMediaBox peer={streamable} clickable={isClickable} />
        {:else if streamable instanceof ScreenSharingPeer}
            <ScreenSharingMediaBox peer={streamable} clickable={isClickable} />
        {:else}
            <LocalStreamMediaBox peer={streamable} clickable={isClickable} cssClass="" />
        {/if}
    </div>
</div>

<style lang="scss">
    @import "../../../style/breakpoints.scss";

    .media-container {
        display: flex;
        margin-top: 4%;
        margin-bottom: 4%;
        margin-left: auto;
        margin-right: auto;
        transition: margin-left 0.2s, margin-right 0.2s, margin-bottom 0.2s, margin-top 0.2s, max-height 0.2s,
            max-width 0.2s;
        pointer-events: auto;

        padding: 0;
        max-height: 200px;
        max-width: 85%;

        &:hover {
            margin-top: 2%;
            margin-bottom: 2%;
        }

        &.hightlighted {
            margin-top: 0% !important;
            margin-bottom: 0% !important;
            margin-left: 0% !important;

            max-height: 100% !important;
            max-width: 96% !important;

            &:hover {
                margin-top: 0% !important;
                margin-bottom: 0% !important;
            }
        }

        &.mozaic-solo {
            max-height: inherit !important;
            width: 90% !important;
        }

        &.mozaic-full-width {
            width: 95%;
            max-width: 95%;
            margin-left: 3%;
            margin-right: 3%;
            margin-top: auto;
            margin-bottom: auto;
            max-height: 95%;

            &:hover {
                margin-top: auto;
                margin-bottom: auto;
            }
        }

        &.mozaic-quarter {
            width: 95%;
            max-width: 95%;
            margin-top: auto;
            margin-bottom: auto;
            max-height: 95%;

            &:hover {
                margin-top: auto;
                margin-bottom: auto;
            }
        }

        &.nes-container.is-rounded {
            border-image-outset: 1;
        }

        &.clickable {
            cursor: url("../../../style/images/cursor_pointer.png"), pointer;
        }

        > div {
            background-color: rgba(0, 0, 0, 0.6);
            display: flex;
            width: 100%;
        }
    }

    @include media-breakpoint-only(md) {
        .media-container {
            margin-top: 10%;
            margin-bottom: 10%;
        }
    }
</style>
