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
    import loaderImg from "./../images/loader.svg";

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
            class="transition-all self-end relative aspect-video w-[350px]"
            class:hightlighted={isHightlighted}
            class:mr-6={isHightlighted && videoEnabled}
            class:flex={!isHightlighted}
            class:media-box-camera-on-size={!isHightlighted && videoEnabled}
            class:media-box-camera-off-size={!isHightlighted && !videoEnabled}
            class:max-w-sm={isHightlighted && !videoEnabled}
            class:mx-auto={isHightlighted && !videoEnabled}
            class:m-auto={!isHightlighted && !videoEnabled}
            class:h-12={!isHightlighted && !videoEnabled}
            class:clickable={isClickable}
            class:mozaic-duo={mozaicDuo}
            class:mozaic-full-width={mozaicSolo}
            class:mozaic-quarter={mozaicQuarter}
        >
            <VideoMediaBox peer={streamable} clickable={isClickable} />
        </div>
    {/if}
{:else if streamable instanceof ScreenSharingPeer}
    <div
        class="media-container {isHightlighted ? 'hightlighted mr-6' : 'flex media-box-camera-on-size'}
     media-box-shape-color
"
        class:clickable={isClickable}
        class:mozaic-duo={mozaicDuo}
        class:mozaic-full-width={mozaicSolo}
        class:mozaic-quarter={mozaicQuarter}
    >
        <div class="{isHightlighted ? 'h-[41vw] mr-6' : 'mx-auto'} w-full h-full flex screen-blocker">
            <ScreenSharingMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div>
{:else if streamable instanceof JitsiTrackStreamWrapper}
    <div
        class="media-container {isHightlighted ? 'hightlighted mr-6' : 'flex media-box-camera-on-size'}
     media-box-shape-color pointer-events-auto screen-blocker
"
        class:clickable={isClickable}
        class:mozaic-duo={mozaicDuo}
        class:mozaic-full-width={mozaicSolo}
        class:mozaic-quarter={mozaicQuarter}
        transition:fly={{ x: 200, duration: 250 }}
    >
        <div class="{isHightlighted ? 'h-[32vw] mr-6' : 'mx-auto'} w-full flex screen-blocker">
            <JitsiMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div>
{:else}
    <div
        class="media-container {isHightlighted ? 'hightlighted mr-6' : 'flex media-box-camera-on-size'}
     media-box-shape-color
"
        class:clickable={isClickable}
        class:mozaic-duo={mozaicDuo}
        class:mozaic-full-width={mozaicSolo}
        class:mozaic-quarter={mozaicQuarter}
    >
        <div class="{isHightlighted ? 'h-[41vw] mr-6' : 'mx-auto'}   w-full h-full flex screen-blocker">
            <LocalStreamMediaBox peer={streamable} clickable={isClickable} cssClass="" />
        </div>
    </div>
{/if}

<style lang="scss">
    @import "../../style/breakpoints.scss";

    //Classes factorizing tailwind's ones are defined in video-ui.scss

    .media-container {
        &.clickable {
            cursor: pointer;
        }
    }
</style>
