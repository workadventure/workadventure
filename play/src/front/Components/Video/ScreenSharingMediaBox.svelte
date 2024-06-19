<script lang="ts">
    //STYLE: Classes factorizing tailwind's ones are defined in video-ui.scss

    import { Color } from "@workadventure/shared-utils";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import type { Streamable } from "../../Stores/StreamableCollectionStore";
    import type { ScreenSharingPeer } from "../../WebRtc/ScreenSharingPeer";
    import { srcObject } from "./utils";
    import BanReportBox from "./BanReportBox.svelte";
    import { onMount } from "svelte";
    import { toggleHighlightMode } from "../../Stores/ActionsCamStore";

    export let peer: ScreenSharingPeer;
    let streamStore = peer.streamStore;
    let name = peer.userName;
    let backGroundColor = Color.getColorByString(peer.userName);
    let textColor = Color.getTextColorByBackgroundColor(backGroundColor);
    let statusStore = peer.statusStore;
    let isHightlighted = true;
    // let fullScreen = writable(false);
    let isFullScreen: boolean;

    let embedScreen: Streamable;

    // const isResized = window.matchMedia("(max-height: 727px)");
    // let isVertical: boolean;
    // let video = document.getElementById("screen-sharing") as HTMLVideoElement;

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

    // $: changeIcon = $highlightedEmbedScreen === embedScreen;
    // console.log(changeIcon, ": change icon du receveur");
    $: isHightlighted = $highlightedEmbedScreen === embedScreen;

    // $: isFullScreen = $fullScreen;
    console.log(toggleHighlightMode + " : is full screen");

    function toggleFullScreen() {
        toggleHighlightMode.update((current) => !current);
        toggleHighlightMode.subscribe((value) => {
            console.log("Full screen is now:", value);
        });

        const video = document.getElementById("screen-sharing") as HTMLVideoElement;
        console.log("Video found", video);
        console.log($toggleHighlightMode + " : toggle highlight mode");
        if (video) {
            if ($toggleHighlightMode) {
                console.log("je suis dans le full screen");

                video.style.height = `${document.documentElement.clientHeight}px`;
                video.style.width = `${document.documentElement.clientWidth}px`;
            } else {
                console.log("je suis dans le else donc plus full screen");
                video.style.height = "100%";
                video.style.width = "100%";
            }
        }
    }

    // function toggleFullScreen() {
    //     console.log("je suis dans le toggle full screen");
    //     fullScreen = !fullScreen;
    //     console.log(fullScreen + " : full screen");
    //     if (isHightlighted) {
    //         if (fullScreen) {
    //             fullScreen = false;
    //             console.log("toggle not full screen");
    //         } else {
    //             fullScreen = true;
    //             console.log("toggle full screen");
    //         }
    //     }
    // }

    // function toggleFullScreen() {
    //     console.log("Toggle full screen");

    //     // Récupérer l'élément vidéo
    //     const video = document.querySelector("video");

    //     if (!video) {
    //         console.error("Video element not found");
    //         return;
    //     }

    //     if (!document.fullscreenElement) {
    //         // Si le mode plein écran n'est pas activé, activer le plein écran
    //         if (video.requestFullscreen) {
    //             video.requestFullscreen();
    //         }
    //         console.log("Entering full screen");
    //     } else {
    //         if (document.exitFullscreen) {
    //             document.exitFullscreen();
    //         }
    //         console.log("Exiting full screen");
    //     }
    // }

    // function toggleHighlight() {
    //     highlightedEmbedScreen.toggleHighlight(embedScreen);
    // }

    // function toggleHighlight() {
    //     console.log("toggle highlight");
    //     highlightedEmbedScreen.toggleHighlight(peer);
    //     highlightedEmbedScreen.subscribe((value) => {
    //         console.log("je suis dans le local screen sharing");
    //         if (value) {
    //             isHightlighted = true;
    //             console.log(isHightlighted + " : is highlighted");
    //         } else {
    //             isHightlighted = false;
    //             console.log(isHightlighted + " : is not highlighted");
    //         }
    //     });
    // }

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
<div class="group/screenshare video-container h-full w-full relative screen-sharing" id="screen-sharing">
    {#if $statusStore === "connecting"}
        <div class="connecting-spinner" />
    {/if}
    {#if $statusStore === "error"}
        <div class="rtc-error" />
    {/if}
    {#if $streamStore !== null}
        <div
            class={$toggleHighlightMode
                ? "fixed top-0 left-0 w-full h-full"
                : "h-full w-full fullscreen mx-auto rounded object-contain"}
            id="video-container"
        >
            <video
                use:srcObject={$streamStore}
                autoplay
                playsinline
                class="h-full w-full mx-auto rounded object-contain"
                muted
            />
            <div class={isHightlighted ? "flex justify-center" : "absolute top-[70%]"}>
                <span
                    style="background-color: {backGroundColor}; color: {textColor};"
                    class="nametag-text nametag-shape pr-3 pl-2 h-3 max-h-8">{name}</span
                >
                <BanReportBox {peer} />
            </div>
        </div>
        <div
            class={isHightlighted
                ? "hidden"
                : "absolute top-0 bottom-0 right-0 left-0 m-auto h-14 w-14 z-20 p-4 rounded-full aspect-ratio bg-contrast/50 opacity-0 group-hover/screenshare:opacity-100 backdrop-blur transition-all"}
            on:click={() => highlightedEmbedScreen.toggleHighlight(embedScreen)}
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
        <!-- bouton du toggle-->

        <div
            class={isHightlighted
                ? "absolute top-0 bottom-0 right-0 left-0 m-auto h-28 w-60 z-20 rounded-lg bg-contrast/50 backdrop-blur transition-all opacity-0 group-hover/screenshare:opacity-100 flex items-center justify-center"
                : "hidden"}
        >
            <div class="block flex flex-col justify-evenly h-full w-full">
                <div
                    class="svg w-full hover:bg-white/10 flex justify-around items-center z-25 rounded-lg"
                    on:click={() => highlightedEmbedScreen.toggleHighlight(embedScreen)}
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
                    class="w-full hover:bg-white/10 flex justify-around items-center z-25 rounded-lg"
                    on:click={toggleFullScreen}
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
                        <path d="M5 9l4 0l0 -4" />
                        <path d="M3 3l6 6" />
                        <path d="M5 15l4 0l0 4" />
                        <path d="M3 21l6 -6" />
                        <path d="M19 9l-4 0l0 -4" />
                        <path d="M15 9l6 -6" />
                        <path d="M19 15l-4 0l0 4" />
                        <path d="M15 15l6 6" />
                    </svg>
                    <p class="font-bold text-white">Toggle full screen</p>
                </div>
            </div>
        </div>
    {/if}
</div>
