<script lang="ts">
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { ScreenSharingLocalMedia } from "../../Stores/ScreenSharingStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { srcObject } from "./utils";

    export let clickable = false;

    export let peer: ScreenSharingLocalMedia;
    let stream = peer.stream;
    export let cssClass: string | undefined;
    let embedScreen: Streamable;
    let changeIcon = true;
    let visibleIcon = false;

    $: changeIcon = !!$highlightedEmbedScreen;

    // if (stream) {
    //     embedScreen = {
    //         type: "streamable",
    //         embed: peer as unknown as Streamable,
    //     };
    // }

    function highlight() {
        highlightedEmbedScreen.toggleHighlight(peer);
    }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->

<!--style="height:{$heightCamWrapper}px"-->
<div
    class="group/screenshare m-0 relative video-container rounded-lg screen-sharing {cssClass
        ? cssClass
        : ''} container-class"
    class:hide={!stream}
    on:click={highlight}
>
    {#if stream}
        <video
            class="h-full w-full mx-auto rounded objects-contain screen-blocker {changeIcon ? 'screenshare' : ''}"
            use:srcObject={stream}
            autoplay
            muted
            playsinline
            on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
        />

        <div
            class={changeIcon && visibleIcon
                ? "hidden"
                : "absolute top-0 bottom-0 right-0 left-0 m-auto h-14 w-14 z-20 p-4 rounded-full aspect-ratio bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 pointer-events-none"}
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

        <div
            class={changeIcon && visibleIcon
                ? "absolute top-0 bottom-0 right-0 left-0 m-auto h-14 w-14 z-20 p-4 rounded-full aspect-ratio bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 pointer-events-none"
                : "hidden"}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler icon-tabler-arrows-minimize"
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
                <path d="M5 9l4 0l0 -4" />
                <path d="M3 3l6 6" />
                <path d="M5 15l4 0l0 4" />
                <path d="M3 21l6 -6" />
                <path d="M19 9l-4 0l0 -4" />
                <path d="M15 9l6 -6" />
                <path d="M19 15l-4 0l0 4" />
                <path d="M15 15l6 6" />
            </svg>
        </div>
    {/if}
</div>

<style>
    @container (min-width: 768px) and (max-width: 1023px) {
        .screenshare {
            aspect-ratio: 2.5;
        }
    }

    @container (min-width: 1023px) and (max-width: 1279px) {
        .screenshare {
            aspect-ratio: 2.5;
        }
    }

    @container (min-width: 1280px) and (max-width: 1439px) {
        .screenshare {
            aspect-ratio: 3;
        }
    }

    @container (min-width: 1440px) and (max-width: 1919px) {
        .screenshare {
            aspect-ratio: 2.5;
        }

        .screen-blocker {
            display: flex;
            justify-content: center;
        }
    }
</style>
