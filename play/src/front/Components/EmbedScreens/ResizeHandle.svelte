<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import LL from "../../../i18n/i18n-svelte";

    export let minHeight: number;
    export let maxHeight: number;
    export let onResize: (height: number) => void;
    export let onResizeEnd: () => void = () => {};
    export let dataTestid: string = "resize-handle";

    let dragHandle: HTMLElement;
    let parentElement: HTMLElement;

    let isDragging = false;
    let startY: number;
    let startParentHeight: number;

    const startDragging = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        startY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
        parentElement = dragHandle.parentElement as HTMLElement;
        startParentHeight = dragHandle.offsetTop - parentElement.offsetTop;

        document.addEventListener("mousemove", handleDragging, { passive: true });
        document.addEventListener("mouseup", stopDragging, { passive: true });
        document.addEventListener("touchmove", handleDragging, { passive: true });
        document.addEventListener("touchend", stopDragging, { passive: true });
    };

    function handleDragging(e: MouseEvent | TouchEvent) {
        if (!isDragging) return;

        const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
        const deltaY = clientY - startY;
        const newHeight = startParentHeight + deltaY;
        onResize(Math.min(Math.max(newHeight, minHeight), maxHeight));
    }

    function stopDragging() {
        isDragging = false;
        document.removeEventListener("mousemove", handleDragging);
        document.removeEventListener("mouseup", stopDragging);
        document.removeEventListener("touchmove", handleDragging);
        document.removeEventListener("touchend", stopDragging);
        onResizeEnd();
    }

    onMount(() => {
        dragHandle.addEventListener("mousedown", startDragging, { passive: true });
        dragHandle.addEventListener("touchstart", startDragging, { passive: true });
    });

    onDestroy(() => {
        document.removeEventListener("mousemove", handleDragging);
        document.removeEventListener("mouseup", stopDragging);
        document.removeEventListener("touchmove", handleDragging);
        document.removeEventListener("touchend", stopDragging);

        dragHandle.removeEventListener("mousedown", startDragging);
        dragHandle.removeEventListener("touchstart", startDragging);
    });
</script>

<div
    bind:this={dragHandle}
    data-testid={dataTestid}
    class="group/resize-handle relative drag-handle mx-auto mt-3 w-40 h-1 outline outline-4 outline-contrast bg-white cursor-ns-resize transition-colors rounded-lg"
>
    <div
        class="absolute bottom-0 bg-contrast/80 p-2 px-4 rounded-md pointer-events-none w-fit left-1/2 -translate-x-1/2 group-active/resize-handle:opacity-0 group-hover/resize-handle:translate-y-14 group-hover/resize-handle:opacity-100 opacity-0 transition-all duration-300 z-0"
    >
        <p class="text-white text-sm text-center whitespace-nowrap m-0 p-0">{$LL.video.click_and_drag_to_resize()}</p>
    </div>
</div>

<style>
    .drag-handle {
        pointer-events: auto;
    }

    /* We make the drag handle bigger than it really is to make it more easily selectable (especially on mobile) */
    .drag-handle:after {
        content: "";
        position: absolute;
        top: -20px;
        left: -20px;
        width: 122px;
        height: 45px;
        /*background-color: rgba(255, 0, 0, 0.5);*/
        border-radius: 4px;
    }
</style>
