<script lang="ts">
    import { onDestroy, onMount } from "svelte";

    export let minHeight: number;
    export let maxHeight: number;
    export let currentHeight: number;
    export let onResize: (height: number) => void;
    export let onResizeEnd: () => void = () => {};

    let dragHandle: HTMLElement;

    let isDragging = false;
    let startY: number;
    let startHeight: number;

    const startDragging = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        startY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
        startHeight = currentHeight;

        document.addEventListener("mousemove", handleDragging, { passive: true });
        document.addEventListener("mouseup", stopDragging, { passive: true });
        document.addEventListener("touchmove", handleDragging, { passive: true });
        document.addEventListener("touchend", stopDragging, { passive: true });
    };

    function handleDragging(e: MouseEvent | TouchEvent) {
        if (!isDragging) return;

        const clientY = e instanceof MouseEvent ? e.clientY : e.touches[0].clientY;
        const deltaY = clientY - startY;
        const newHeight = startHeight + deltaY;
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
    class="relative drag-handle mx-auto mt-3 w-20 h-1 outline outline-4 outline-contrast bg-white cursor-ns-resize transition-colors rounded-lg"
/>

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
