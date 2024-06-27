<script lang="ts">
    import { ArrowDownIcon, ArrowUpIcon } from "svelte-feather-icons";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { ScreenSharingLocalMedia } from "../../Stores/ScreenSharingStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import { highlightFullScreen, setHeight } from "../../Stores/ActionsCamStore";
    import { srcObject } from "./utils";
    import { onDestroy, onMount } from "svelte";

    export let clickable = false;

    export let peer: ScreenSharingLocalMedia;
    let stream = peer.stream;
    export let cssClass: string | undefined;
    let embedScreen: Streamable;
    let menuDrop = false;
    let videoContainer: HTMLDivElement;

    onMount(() => {
        calcHeightVideo();
    });

    if (peer) {
        embedScreen = peer as unknown as Streamable;
    }

    $: isHighlighted = $highlightedEmbedScreen === embedScreen;

    function toggleFullScreen() {
        highlightFullScreen.update((current) => !current);
        if (videoContainer) {
            if ($highlightFullScreen) {
                videoContainer.style.height = `${document.documentElement.clientHeight}px`;
                videoContainer.style.width = `${document.documentElement.clientWidth}px`;
            } else {
                videoContainer.style.height = "100%";
                videoContainer.style.width = "100%";
            }
        }
        calcHeightVideo();
    }

    function untogglefFullScreen() {
        highlightedEmbedScreen.toggleHighlight(peer);
        highlightFullScreen.set(false);
        calcHeightVideo();
    }

    $: $setHeight, calcHeightVideo();
    $: $highlightedEmbedScreen === embedScreen, calcHeightVideo();

    function calcHeightVideo() {
        if ($highlightedEmbedScreen === peer && videoContainer) {
            videoContainer.style.height = `${$setHeight}px`;
        }
    }

    const subscription = highlightedEmbedScreen.subscribe(() => {
        calcHeightVideo();
    });

    onDestroy(() => {
        subscription.unsubscribe();
    });
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->

<div
    class="group/screenshare m-0 relative w-full h-full rounded-lg {cssClass ? cssClass : ''} container-class"
    class:hide={!stream}
    id="screen-sharing"
    bind:this={videoContainer}
>
    {#if stream}
        <div
            class={$highlightFullScreen
                ? "fixed top-0 left-0 w-full h-full"
                : "h-full w-full fullscreen mx-auto rounded object-contain"}
        >
            <video
                class="h-full w-full mx-auto rounded objects-contain screen-blocker"
                use:srcObject={stream}
                autoplay
                muted
                playsinline
            />
            <div
                class={isHighlighted
                    ? "w-8 h-8 bg-contrast/80 flex rounded-sm z-10 opacity-0 group-hover/screenshare:opacity-100 absolute inset-0 mx-auto"
                    : "hidden"}
                on:click={() => (menuDrop = !menuDrop)}
            >
                {#if menuDrop}
                    <ArrowUpIcon class="w-4 h-4 m-auto flex items-center text-white" />
                {:else}
                    <ArrowDownIcon class="w-4 h-4 m-auto flex items-center text-white" />
                {/if}
            </div>
        </div>
        <div
            class={isHighlighted
                ? "hidden"
                : "absolute top-0 bottom-0 right-0 left-0 m-auto h-14 w-14 z-20 p-4 rounded-full aspect-ratio bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 cursor-pointer"}
            on:click={() => highlightedEmbedScreen.highlight(peer)}
            on:click={calcHeightVideo}
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                class="icon icon-tabler cursor-pointer icon-tabler-arrows-minimize"
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
            class={isHighlighted && menuDrop
                ? "absolute top-0 bottom-0 right-0 left-0 m-auto h-28 w-60 z-20 rounded-lg bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 flex items-center justify-center cursor-pointer"
                : "hidden"}
        >
            <div class="block flex flex-col justify-evenly cursor-pointer h-full w-full">
                <div
                    class="svg w-full hover:bg-white/10 flex justify-around items-center z-25 rounded-lg"
                    on:click={untogglefFullScreen}
                    on:click={() => (menuDrop = !menuDrop)}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        class="icon icon-tabler cursor-pointer icon-tabler-arrows-maximize"
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
                    <p class="font-bold text-white">Reduce the screen</p>
                </div>
                <div class="h-[1px] z-30 w-full bg-white/20" />
                <div
                    class="w-full hover:bg-white/10 flex justify-around cursor-pointer items-center z-25 rounded-lg"
                    on:click={toggleFullScreen}
                    on:click={() => (menuDrop = !menuDrop)}
                >
                    {#if $highlightFullScreen}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler cursor-pointer icon-tabler-arrows-maximize"
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
                        <p class="font-bold cursor-pointer text-white">Untoggle full screen</p>
                    {:else}
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler cursor-pointer icon-tabler-arrows-minimize"
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
                        <p class="font-bold cursor-pointer text-white">Toggle full screen</p>
                    {/if}
                </div>
            </div>
        </div>
    {/if}
</div>
