<script lang="ts">
    import { fly } from "svelte/transition";
    import { type Readable } from "svelte/store";
    import { onMount, onDestroy } from "svelte";
    import { PeerStatus, VideoPeer } from "../../WebRtc/VideoPeer";
    import { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import type { ObtainedMediaStreamConstraints } from "../../WebRtc/P2PMessages/ConstraintMessage";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { JitsiTrackStreamWrapper } from "../../Streaming/Jitsi/JitsiTrackStreamWrapper";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import VideoMediaBox from "./VideoMediaBox.svelte";
    import ScreenSharingMediaBox from "./ScreenSharingMediaBox.svelte";
    import LocalStreamMediaBox from "./LocalStreamMediaBox.svelte";
    import JitsiMediaBox from "./JitsiMediaBox.svelte";

    export let streamable: Streamable;
    export let isHightlighted = false;
    export let isClickable = false;

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
    $: isHightlighted = $highlightedEmbedScreen === streamable;
</script>

<!-- Bug with tansition : transition:fly={{ y: 50, duration: 150 }} -->

{#if streamable instanceof VideoPeer}
    {#if $constraintStore || $statusStore === "error" || $statusStore === "connecting"}
        <div
            class="media-container transition-all justify-center relative h-full w-full"
            class:hightlighted={isHightlighted}
            class:mx-auto={isHightlighted && !videoEnabled}
            class:m-auto={!isHightlighted && !videoEnabled}
            class:aspect-video={!isHightlighted && !videoEnabled}
            class:clickable={isClickable}
            in:fly={{ y: 50, duration: 150 }}
        >
            <VideoMediaBox peer={streamable} />
        </div>
    {/if}
{:else if streamable instanceof ScreenSharingPeer}
    <div
        class="media-container justify-center w-full
            media-box-shape-color"
        class:clickable={isClickable}
    >
        <ScreenSharingMediaBox peer={streamable} />
    </div>
{:else if streamable instanceof JitsiTrackStreamWrapper}
    <div
        class="media-container media-box-shape-color pointer-events-auto screen-blocker"
        class:hightlighted={isHightlighted}
        class:mr-6={isHightlighted && streamable.getVideoTrack()}
        class:flex={!isHightlighted}
        class:media-box-camera-on-size={!isHightlighted && streamable.getVideoTrack()}
        class:media-box-camera-off-size={!isHightlighted && !streamable.getVideoTrack()}
        class:max-w-sm={isHightlighted && !streamable.getVideoTrack()}
        class:mx-auto={isHightlighted && !streamable.getVideoTrack()}
        class:m-auto={!isHightlighted && !streamable.getVideoTrack()}
        class:h-12={!isHightlighted && !streamable.getVideoTrack()}
        class:clickable={isClickable}
    >
        <div
            class="w-full flex screen-blocker"
            class:mr-6={isHightlighted}
            class:mx-auto={!isHightlighted}
            class:h-[32vw]={isHightlighted && videoEnabled}
        >
            <JitsiMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div>
{:else}
    <div class="media-container {isHightlighted ? 'hightlighted' : 'flex h-full'}" class:clickable={isClickable}>
        <!-- Here for the resize o-->
        <div class="{isHightlighted ? 'cam-share-receive' : 'mx-auto'} flex justify-center screen-blocker">
            <LocalStreamMediaBox peer={streamable} cssClass="" />
        </div>
    </div>
{/if}
