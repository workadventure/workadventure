<script lang="ts">
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import VideoMediaBox from "./VideoMediaBox.svelte";
    import ScreenSharingMediaBox from "./ScreenSharingMediaBox.svelte";
    import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import LocalStreamMediaBox from "./LocalStreamMediaBox.svelte";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import VideoOffBox from "./VideoOffBox.svelte";
    import "../../../style/wa-theme/video-ui.scss"; //Classes factorizing tailwind's ones are defined here
    import { ObtainedMediaStreamConstraints } from "../../Stores/MediaStore";
    import { Readable } from "svelte/store";

    export let streamable: Streamable;
    export let isHightlighted = false;
    export let isClickable = false;
    export let mozaicSolo = false;
    export let mozaicFullWidth = false;
    export let mozaicQuarter = false;

    let constraintStore: Readable<ObtainedMediaStreamConstraints | null>;
    if (streamable instanceof VideoPeer) {
        constraintStore = streamable.constraintsStore;
    }
</script>

{#if streamable instanceof VideoPeer}
    {#if $constraintStore && !$constraintStore.video}
        <div
                class="media-container {isHightlighted
                ? 'hightlighted tw-max-w-sm tw-mx-auto'
                : 'tw-flex tw-m-auto tw-flex media-box-camera-off-size tw-h-10'}
     media-box-shape-color tw-pointer-events-auto tw-p-0
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
                class="media-container {isHightlighted ? 'hightlighted tw-mr-6' : 'tw-flex media-box-camera-on-size'}
     media-box-shape-color
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
            class="media-container {isHightlighted ? 'hightlighted tw-mr-6' : 'tw-flex media-box-camera-on-size'}
     media-box-shape-color
"
            class:clickable={isClickable}
            class:mozaic-solo={mozaicSolo}
            class:mozaic-full-width={mozaicFullWidth}
            class:mozaic-quarter={mozaicQuarter}
    >
        <div class="{isHightlighted ? 'tw-h-[41vw] tw-mr-6' : 'tw-mx-auto'} tw-w-full tw-h-full tw-flex">
            <ScreenSharingMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div>
{:else}
    <div
        class="media-container {isHightlighted ? 'hightlighted tw-mr-6' : 'tw-flex media-box-camera-on-size'}
     media-box-shape-color
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

        &:hover {
            margin-top: 2%;
            margin-bottom: 2%;
        }
        &.clickable {
            cursor: url("../../../style/images/cursor_pointer.png"), pointer;
        }
    }
</style>
