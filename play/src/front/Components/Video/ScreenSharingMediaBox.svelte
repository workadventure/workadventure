<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import type { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import { srcObject } from "./utils";
    import BanReportBox from "./BanReportBox.svelte";
    import { onMount } from "svelte";

    export let peer: ScreenSharingPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let backGroundColor = Color.getColorByString(peer.userName);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;
    let changeIcon = true;
    let visibleIcon = false;

    // const isResized = window.matchMedia("(max-height: 727px)");
    // let isVertical: boolean;
    // let video = document.getElementById("screen-sharing") as HTMLVideoElement;

    let embedScreen: Streamable;

    $: visibleIcon = $statusStore === "connected";

    if (peer) {
        embedScreen = peer as unknown as Streamable;
    }

    onMount(() => {
        embedScreen = peer;
        // isResized.addEventListener("change", (e: any) => handleTabletChange(e));
        // handleTabletChange(isResized);
        // isNearBottom(video);
    });

    // function handleTabletChange(e: MediaQueryList) {
    //     isNearBottom(video);
    //     if (e.matches) {
    //         isVertical = true;
    //         console.log("Vertical");
    //     } else {
    //         isVertical = false;
    //         console.log("Horizontal ou vertical pas rezize");
    //     }
    // }

    function highlight() {
        if ($statusStore === "connected") {
            highlightedEmbedScreen.toggleHighlight(embedScreen);
        }
        return;
    }

    $: changeIcon = $highlightedEmbedScreen === embedScreen;

    // function isNearBottom(element: HTMLElement) {
    //     if (window.innerHeight - element.getBoundingClientRect().bottom < 50) {
    //         video.style.objectFit = "contain";
    //         console.log("Near bottom");
    //     } else {
    //         console.log("Not near bottom");
    //     }
    // }
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="group/screenshare video-container h-full w-full relative screen-sharing"
    id="screen-sharing"
    on:click={highlight}
>
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    {#if $streamStore !== null}
        <div class="w-full h-full mx-auto rounded object-contain" id="video">
            <video
                use:srcObject={$streamStore}
                autoplay
                playsinline
                class="h-full w-full mx-auto rounded object-contain"
                muted
            />
            <div class="flex justify-center">
                <span
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="nametag-text nametag-shape pr-3 pl-2 h-3 max-h-8">{name}</span
                >
                <BanReportBox {peer} />
            </div>
        </div>
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
