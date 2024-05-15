<script lang="ts">
    import { fly } from "svelte/transition";
    import { type Readable } from "svelte/store";
    import { onMount, onDestroy, createEventDispatcher } from "svelte";
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
    import { mediaStreamConstraintsStore } from "../../Stores/MediaStore";
    import { identity } from "lodash";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";

    export let streamable: Streamable;
    export let isHightlighted = false;
    export let isClickable = false;
    let isHighlighted: boolean;
    let embedScreen: Streamable;
    // export let mozaicSolo = false;
    // export let mozaicDuo = false;
    // export let mozaicQuarter = false;

    const dispatch = createEventDispatcher();

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
        dispatch("camMounted");
        consoleLog();
        console.log("MOUNTED MEDIA BOX");
    });

    // function getWidthOfCam() {
    //     camWidth = (document.getElementsByClassName("width")[0] as HTMLElement)?.offsetWidth;
    //     console.log("TTTEEEESSSSTTTTTT", camWidth);
    // }

    onDestroy(() => {
        gameScene.reposition();
        dispatch("camUnmounted");
    });

    function consoleLog() {
        if (streamable instanceof VideoPeer) {
            console.log("Si le streamable est une vidéo d'une autre personne", streamable);
        } else if (streamable instanceof ScreenSharingPeer) {
            console.log("Si le streamable est un partage d'écran de la part d'un autre utilisateur !", streamable);
        } else if (streamable instanceof JitsiTrackStreamWrapper) {
            console.log("Si le streamable est une vidéo de l'utilisateur", streamable);
        } else {
            console.log("Div pour celui qui partage son écran avec partage d'écran en petit", streamable);
        }
    }

    // function addStyleSpeaker() {
    //     if ($constraintStore && $constraintStore.audio !== false) {

    //     }
    // }

    function hightlight() {
        isHighlighted = !isHighlighted;
        console.log("JE SUIS DANS LA FONCTION HIGHLIGHT DE MEDIA BOX");
        if (isHightlighted) {
            console.log("JE SUIS DANS LE TRUE :", $highlightedEmbedScreen);
            highlightedEmbedScreen.removeHighlight();
        } else {
            console.log("JE SUIS DANS LE FALSE :", $highlightedEmbedScreen);
            highlightedEmbedScreen.setHighlight(embedScreen);
        }
        // highlightedEmbedScreen.toggleHighlight(embedScreen);
    }

    $: videoEnabled = $constraintStore ? $constraintStore.video : false;
</script>

<!-- Si le streamable est une vidéo d'une autre personne -->
{#if streamable instanceof VideoPeer}
    {#if $constraintStore || $statusStore === "error" || $statusStore === "connecting"}
        <div
            class="transition-all relative h-full aspect-video w-fit {$mediaStreamConstraintsStore.audio
                ? 'border-8 border-solid bg-indigo-400 rounded-lg'
                : ''}"
            class:hightlighted={isHightlighted}
            class:mr-6={isHightlighted && videoEnabled}
            class:max-w-sm={isHightlighted && !videoEnabled}
            class:mx-auto={isHightlighted && !videoEnabled}
            class:m-auto={!isHightlighted && !videoEnabled}
            class:aspect-video={!isHightlighted && !videoEnabled}
            class:clickable={isClickable}
            transition:fly={{ y: 50, duration: 150 }}
        >
            <!-- Video de l'autre personne-->
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="width" on:click={() => hightlight()}>
                <VideoMediaBox peer={streamable} clickable={isClickable} />
            </div>
        </div>
    {/if}

    <!-- Si le streamable est un partage d'écran de la part d'un autre utilisateur !-->
{:else if streamable instanceof ScreenSharingPeer}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="media-container justify-center h-full w-full
            media-box-shape-color receiving-sharing"
        class:clickable={isClickable}
        on:click={() => hightlight()}
    >
        <ScreenSharingMediaBox peer={streamable} clickable={isClickable} />
    </div>

    <!-- Test pour m'inspirer de ces props css pour le mode mobile de celui qui recoit le partage mais en mode display block et non flex -->
    <!-- <div
        class="media-container {isHightlighted ? 'hightlighted mr-6' : 'flex h-full aspect-ratio'}"
        class:clickable={isClickable}
        class:mozaic-full-width={mozaicSolo}
        class:mozaic-duo={mozaicDuo}
        class:mozaic-quarter={mozaicQuarter}
    >
        <div class="{isHightlighted ? 'h-[41vw] mr-6' : 'mx-auto'}   w-full h-full flex screen-blocker">
            <ScreenSharingMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div> -->

    <!-- Si le streamable est une vidéo de l'utilisateur-->
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
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            class="w-full flex screen-blocker"
            class:mr-6={isHightlighted}
            class:mx-auto={!isHightlighted}
            class:h-[32vw]={isHightlighted && videoEnabled}
            on:click={() => hightlight()}
        >
            <JitsiMediaBox peer={streamable} clickable={isClickable} />
        </div>
    </div>
{:else}
    <!-- Div pour celui qui partage son écran avec partage d'écran en petit-->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        class="media-container {isHightlighted ? 'hightlighted mr-6' : 'flex h-full aspect-ratio'}"
        class:clickable={isClickable}
        on:click={() => hightlight()}
    >
        <div class="{isHightlighted ? 'h-[41vw] mr-6' : 'mx-auto'}   w-full h-full flex screen-blocker">
            <LocalStreamMediaBox peer={streamable} clickable={isClickable} cssClass="" />
        </div>
    </div>
{/if}

<!-- class:mozaic-full-width={mozaicSolo}
        class:mozaic-duo={mozaicDuo}
        class:mozaic-quarter={mozaicQuarter} -->
<style lang="scss">
    @import "../../style/breakpoints.scss";

    @include media-breakpoint-up(sm) {
        .receiving-sharing {
            display: block;
        }
    }
    //Classes factorizing tailwind's ones are defined in video-ui.scss

    .media-container {
        &.clickable {
            cursor: pointer;
        }
    }

    .width {
        width: 350px;
    }
</style>
