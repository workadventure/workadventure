<script lang="ts">
    import { fly } from "svelte/transition";
    import type { Readable } from "svelte/store";
    import { onMount, onDestroy } from "svelte";
    import { PeerStatus, VideoPeer } from "../../WebRtc/VideoPeer";
    import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import type { ObtainedMediaStreamConstraints } from "../../WebRtc/P2PMessages/ConstraintMessage";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { JitsiTrackStreamWrapper } from "../../Streaming/Jitsi/JitsiTrackStreamWrapper";
    import VideoMediaBox from "./VideoMediaBox.svelte";
    import ScreenSharingMediaBox from "./ScreenSharingMediaBox.svelte";
    import LocalStreamMediaBox from "./LocalStreamMediaBox.svelte";
    import JitsiMediaBox from "./JitsiMediaBox.svelte";

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
    let statusStore: Readable<PeerStatus> | null;
    if (streamable instanceof VideoPeer || streamable instanceof ScreenSharingPeer) {
        statusStore = streamable.statusStore;
    }

    const gameScene = gameManager.getCurrentGameScene();

    onMount(() => {
        gameScene.reposition();
    });

    onDestroy(() => {
        gameScene.reposition();
    });
    $: videoEnabled = $constraintStore ? $constraintStore.video : false;
</script>

{#if streamable instanceof VideoPeer}
    {#if $constraintStore || $statusStore === "error" || $statusStore === "connecting"}
        <div
            class="media-container media-box-shape-color tw-pointer-events-auto screen-blocker"
            class:hightlighted={isHightlighted}
            class:tw-mr-6={isHightlighted && videoEnabled}
            class:tw-flex={!isHightlighted}
            class:media-box-camera-on-size={!isHightlighted && videoEnabled}
            class:media-box-camera-off-size={!isHightlighted && !videoEnabled}
            class:tw-max-w-sm={isHightlighted && !videoEnabled}
            class:tw-mx-auto={isHightlighted && !videoEnabled}
            class:tw-m-auto={!isHightlighted && !videoEnabled}
            class:tw-h-12={!isHightlighted && !videoEnabled}
            class:clickable={isClickable}
            class:mozaic-duo={mozaicDuo}
            class:mozaic-full-width={mozaicSolo}
            class:mozaic-quarter={mozaicQuarter}
        >
            <div
                class="tw-w-full tw-flex screen-blocker"
                class:tw-mr-6={isHightlighted}
                class:tw-mx-auto={!isHightlighted}
                class:tw-h-[32vw]={isHightlighted && videoEnabled}
            >
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
    >
        <div class="{isHightlighted ? 'tw-h-[41vw] tw-mr-6' : 'tw-mx-auto'} tw-w-full tw-h-full tw-flex screen-blocker">
            <ScreenSharingMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div>
{:else if streamable instanceof JitsiTrackStreamWrapper}
    <div
        class="media-container {isHightlighted ? 'hightlighted tw-mr-6' : 'tw-flex media-box-camera-on-size'}
     media-box-shape-color tw-pointer-events-auto screen-blocker
"
        class:clickable={isClickable}
        class:mozaic-duo={mozaicDuo}
        class:mozaic-full-width={mozaicSolo}
        class:mozaic-quarter={mozaicQuarter}
        transition:fly={{ x: 200, duration: 250 }}
    >
        <div class="{isHightlighted ? 'tw-h-[32vw] tw-mr-6' : 'tw-mx-auto'} tw-w-full tw-flex screen-blocker">
            <JitsiMediaBox peer={streamable} clickable={isClickable} />
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
            cursor: pointer;
        }
    }
</style>
