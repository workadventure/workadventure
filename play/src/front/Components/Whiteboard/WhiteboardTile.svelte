<script lang="ts">
    import { getContext } from "svelte";
    import excalidrawSvg from "../images/applications/icon_excalidraw.svg";

    interface Props {
        // The board itself, owned by WhiteboardStore: this tile only shows it.
        host: HTMLDivElement;
        title: string;
    }

    let { host, title }: Props = $props();

    // In the row of cameras (and in the strip beside a fullscreen view) the board would be unusable: show what it is.
    const asThumbnail =
        getContext<boolean>("inCameraContainer") === true ||
        getContext<boolean>("inHighlightFullscreenParticipantList") === true;

    // Moves the board into this box, and out of it when the box goes: the layout recreates boxes all the time,
    // the board (and its session) must outlive them.
    function showBoard(node: HTMLDivElement) {
        node.appendChild(host);
        return {
            destroy() {
                if (host.parentElement === node) {
                    host.remove();
                }
            },
        };
    }
</script>

{#if asThumbnail}
    <div class="w-full h-full flex flex-col items-center justify-center gap-2 bg-contrast/80 rounded-lg text-white">
        <img draggable="false" src={excalidrawSvg} class="w-10 h-10" alt="" />
        <span class="text-sm font-bold px-2 text-center truncate max-w-full">{title}</span>
    </div>
{:else}
    <div
        use:showBoard
        class="relative w-full h-full bg-white rounded-lg overflow-hidden"
        data-testid="whiteboard-stage"
    ></div>
{/if}
