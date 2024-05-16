<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { ScreenSharingLocalMedia } from "../../Stores/ScreenSharingStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { heightCamWrapper } from "../../Stores/EmbedScreensStore";
    import { srcObject } from "./utils";
    import { onMount } from "svelte";

    export let clickable = false;

    export let peer: ScreenSharingLocalMedia;
    let stream = peer.stream;
    export let cssClass: string | undefined;
    let embedScreen: Streamable;

    onMount(() => {
        console.log("bonjour je suis mon propre partage d'ecran dans local stream media box");
    });

    // if (stream) {
    //     embedScreen = {
    //         type: "streamable",
    //         embed: peer as unknown as Streamable,
    //     };
    // }

    function highlight() {
        console.log("JE SUIS DANS LA FONCTION HIGHLIGHT DE SON PROPRE PARTAGE ECRAN");
        highlightedEmbedScreen.toggleHighlight(peer);
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<!--style="height:{$heightCamWrapper}px"-->
<div
    class="group/screenshare relative video-container rounded-lg {cssClass ? cssClass : ''}"
    class:hide={!stream}
    on:click={highlight}
>
    {#if stream}
        <video
            class="h-full max-w-full mx-auto rounded screen-blocker"
            use:srcObject={stream}
            autoplay
            muted
            playsinline
            on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
        />
        <div
            class="absolute top-0 bottom-0 right-0 left-0 m-auto h-14 w-14 z-20 p-4 rounded-full aspect-ratio bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 pointer-events-none"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler icon-tabler-arrows-maximize"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                stroke-width="1.5"
                stroke="#ffffff"
                fill="none"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M16 4l4 0l0 4" />
                <path d="M14 10l6 -6" />
                <path d="M8 20l-4 0l0 -4" />
                <path d="M4 20l6 -6" />
                <path d="M16 20l4 0l0 -4" />
                <path d="M14 14l6 6" />
                <path d="M8 4l-4 0l0 4" />
                <path d="M4 4l6 6" />
            </svg>
        </div>
    {/if}
</div>
