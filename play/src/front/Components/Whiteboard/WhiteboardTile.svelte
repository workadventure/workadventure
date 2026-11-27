<script lang="ts">
    import { getContext } from "svelte";
    import excalidrawSvg from "../images/applications/icon_excalidraw.svg";
    import type { WhiteboardBoard } from "../../Stores/WhiteboardStore";
    import WhiteboardHeader from "./WhiteboardHeader.svelte";
    import { showBoard } from "./showBoard";

    interface Props {
        // The board itself, owned by WhiteboardStore: this tile only shows it.
        board: WhiteboardBoard;
    }

    let { board }: Props = $props();

    // In the row of cameras (and in the strip beside a fullscreen view) the board would be unusable: show a picture.
    const asThumbnail =
        getContext<boolean>("inCameraContainer") === true ||
        getContext<boolean>("inHighlightFullscreenParticipantList") === true;

    let hasPicture = $state(false);

    // ponytail: polls every 2 s while the thumbnail shows (the picture is only redrawn when the scene changed);
    // push from Excalidraw's onChange instead if it ever shows up in a profile.
    function showPicture(node: HTMLDivElement) {
        let stopped = false;
        const refresh = async () => {
            const picture = await board.preview();
            if (stopped) {
                return;
            }
            if (picture) {
                picture.setAttribute("width", "100%");
                picture.setAttribute("height", "100%");
                node.replaceChildren(picture);
            } else {
                node.replaceChildren();
            }
            hasPicture = picture !== undefined;
        };
        const refreshNow = () => {
            refresh().catch((error) => console.error("Could not draw the whiteboard", error));
        };
        refreshNow();
        const timer = setInterval(refreshNow, 2000);
        return {
            destroy() {
                stopped = true;
                clearInterval(timer);
            },
        };
    }
</script>

{#if asThumbnail}
    <div class="relative w-full h-full bg-white rounded-lg overflow-hidden" data-testid="whiteboard-thumbnail">
        <div use:showPicture class="absolute inset-0 p-2"></div>
        {#if !hasPicture}
            <img draggable="false" src={excalidrawSvg} class="absolute inset-0 m-auto w-10 h-10 opacity-50" alt="" />
        {/if}
        <div
            class="absolute bottom-1 left-1 max-w-[calc(100%-0.5rem)] flex items-center gap-1 rounded-md bg-contrast/80 px-2 py-0.5 text-white"
        >
            <img draggable="false" src={excalidrawSvg} class="w-4 h-4 shrink-0" alt="" />
            <span class="text-sm font-bold truncate">{board.title}</span>
        </div>
    </div>
{:else}
    <!-- The box reaches the bottom of the window: keep a gap under the board. -->
    <div class="w-full h-full flex flex-col gap-1 pb-4">
        <WhiteboardHeader {board} />
        <div
            use:showBoard={board.host}
            class="relative flex-1 min-h-0 bg-white rounded-lg overflow-hidden"
            data-testid="whiteboard-stage"
        ></div>
    </div>
{/if}
