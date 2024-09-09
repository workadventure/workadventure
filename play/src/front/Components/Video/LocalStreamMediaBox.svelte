<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { Unsubscriber } from "svelte/store";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { EmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { ScreenSharingLocalMedia } from "../../Stores/ScreenSharingStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { scriptUtils } from "../../Api/ScriptUtils";
    import { hiddenStore } from "../../Stores/VisibilityStore";
    import { srcObject } from "./utils";

    export let clickable = false;

    export let peer: ScreenSharingLocalMedia;
    let stream = peer.stream;
    export let cssClass: string | undefined;
    let embedScreen: EmbedScreen;
    let videoElement: HTMLVideoElement;

    let unsubscribeHidenStore: Unsubscriber | undefined;

    onMount(() => {
        if (stream) {
            embedScreen = {
                type: "streamable",
                embed: peer as unknown as Streamable,
            };
        }

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

<div class="video-container {cssClass ? cssClass : ''}" class:hide={!stream}>
    {#if stream}
        <video
            bind:this={videoElement}
            class="tw-h-full tw-max-w-full tw-mx-auto tw-rounded screen-blocker"
            use:srcObject={stream}
            autoplay
            muted
            playsinline
            on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
        />
    {/if}
</div>
