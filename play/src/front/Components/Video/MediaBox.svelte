<script lang="ts">
    import { VideoPeer } from "../../WebRtc/VideoPeer";
    import VideoMediaBox from "./VideoMediaBox.svelte";
    import ScreenSharingMediaBox from "./ScreenSharingMediaBox.svelte";
    import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import LocalStreamMediaBox from "./LocalStreamMediaBox.svelte";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import VideoOffBox from "./VideoOffBox.svelte";
    import type { ObtainedMediaStreamConstraints } from "../../Stores/MediaStore";
    import type { Readable } from "svelte/store";
    import { fly } from "svelte/transition";
    import { gameManager } from "../../Phaser/Game/GameManager";

    export let streamable: Streamable;
    export let isHightlighted = false;
    export let isClickable = false;
    export let mozaicSolo = false;
    export let mozaicDuo = false;
    export let mozaicQuarter = false;

    let constraintStore: Readable<ObtainedMediaStreamConstraints | null>;
    if (streamable instanceof VideoPeer) {
        constraintStore = streamable.constraintsStore;
    }

    const gameScene = gameManager.getCurrentGameScene();

    function triggerReposition() {
        gameScene.reposition();
    }
</script>

{#if streamable instanceof VideoPeer}
    {#if $constraintStore && !$constraintStore.video}
        <div
            class="media-container {isHightlighted
                ? 'hightlighted tw-max-w-sm tw-mx-auto'
                : 'tw-flex tw-m-auto tw-flex media-box-camera-off-size tw-h-12'}
     media-box-shape-color tw-pointer-events-auto tw-p-0 screen-blocker
"
            class:clickable={isClickable}
            class:mozaic-duo={mozaicDuo}
            class:mozaic-full-width={mozaicSolo}
            class:mozaic-quarter={mozaicQuarter}
            transition:fly={{ x: 200, duration: 250 }}
            on:introend={() => {
                triggerReposition();
            }}
            on:outroend={() => {
                triggerReposition();
            }}
        >
            <div class="{isHightlighted ? 'tw-mr-6' : 'tw-mx-auto'} tw-w-full tw-flex screen-blocker">
                <VideoOffBox peer={streamable} clickable={false} />
            </div>
        </div>
    {:else if $constraintStore && $constraintStore.video}
        <div
            class="media-container {isHightlighted ? 'hightlighted tw-mr-6' : 'tw-flex media-box-camera-on-size'}
     media-box-shape-color tw-pointer-events-auto screen-blocker
"
            class:clickable={isClickable}
            class:mozaic-duo={mozaicDuo}
            class:mozaic-full-width={mozaicSolo}
            class:mozaic-quarter={mozaicQuarter}
            transition:fly={{ x: 200, duration: 250 }}
            on:introend={() => {
                triggerReposition();
            }}
            on:outroend={() => {
                triggerReposition();
            }}
        >
            <div class="{isHightlighted ? 'tw-h-[32vw] tw-mr-6' : 'tw-mx-auto'} tw-w-full tw-flex screen-blocker">
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
        class:mozaic-duo={mozaicDuo}
        class:mozaic-full-width={mozaicSolo}
        class:mozaic-quarter={mozaicQuarter}
        transition:fly={{ x: 200, duration: 250 }}
        on:introend={() => {
            triggerReposition();
        }}
        on:outroend={() => {
            triggerReposition();
        }}
    >
        <div class="{isHightlighted ? 'tw-h-[41vw] tw-mr-6' : 'tw-mx-auto'} tw-w-full tw-h-full tw-flex screen-blocker">
            <ScreenSharingMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div>
{:else}
    <div
        class="media-container {isHightlighted ? 'hightlighted tw-mr-6' : 'tw-flex media-box-camera-on-size'}
     media-box-shape-color
"
        class:clickable={isClickable}
        class:mozaic-duo={mozaicDuo}
        class:mozaic-full-width={mozaicSolo}
        class:mozaic-quarter={mozaicQuarter}
        transition:fly={{ x: 200, duration: 250 }}
        on:introend={() => {
            triggerReposition();
        }}
        on:outroend={() => {
            triggerReposition();
        }}
    >
        <div
            class="{isHightlighted ? 'tw-h-[41vw] tw-mr-6' : 'tw-mx-auto'}   tw-w-full tw-h-full tw-flex screen-blocker"
        >
            <LocalStreamMediaBox peer={streamable} clickable={isClickable} cssClass="" />
        </div>
    </div>
{/if}

<style lang="scss">
    @import "../../style/breakpoints.scss";

    //Classes factorizing tailwind's ones are defined in video-ui.scss

    .media-container {
        transition: margin-left 0.2s, margin-right 0.2s, margin-bottom 0.2s, margin-top 0.2s, max-height 0.2s,
            max-width 0.2s;

        &:hover {
            margin-top: 4%;
            margin-bottom: 2%;
        }

        &.clickable {
            cursor: url("../../style/images/cursor_pointer.png"), pointer;
        }
    }
</style>
