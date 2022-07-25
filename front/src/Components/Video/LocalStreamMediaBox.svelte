<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
    import type { ScreenSharingLocalMedia } from "../../Stores/ScreenSharingStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { srcObject } from "./utils";

    export let clickable = false;

    export let peer: ScreenSharingLocalMedia;
    let stream = peer.stream;
    export let cssClass: string | undefined;
    let embedScreen: EmbedScreen;

    if (stream) {
        embedScreen = {
            type: "streamable",
            embed: peer as unknown as Streamable,
        };
    }
</script>

<div class="video-container screen-blocker {cssClass ? cssClass : ''}" class:hide={!stream}>
    {#if stream}
        <video
            class="tw-text-pop-greentw-h-full tw-max-w-full tw-mx-auto tw-rounded"
            use:srcObject={stream}
            autoplay
            muted
            playsinline
            on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
        />
    {/if}
</div>
