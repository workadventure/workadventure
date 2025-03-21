<script lang="ts">
    import { onDestroy } from "svelte";

    export let minHeight: number;
    export let maxHeight: number;
    export let currentHeight: number;
    export let onResize: (height: number) => void;

    let isDragging = false;
    let startY: number;
    let startHeight: number;

    function startDragging(e: MouseEvent) {
        isDragging = true;
        startY = e.clientY;
        startHeight = currentHeight;

        document.addEventListener("mousemove", handleDragging);
        document.addEventListener("mouseup", stopDragging);
    }

    function handleDragging(e: MouseEvent) {
        if (!isDragging) return;

        const deltaY = e.clientY - startY;
        const newHeight = startHeight + deltaY;
        onResize(Math.min(Math.max(newHeight, minHeight), maxHeight));
    }

    function stopDragging() {
        isDragging = false;
        document.removeEventListener("mousemove", handleDragging);
        document.removeEventListener("mouseup", stopDragging);
    }

    onDestroy(() => {
        document.removeEventListener("mousemove", handleDragging);
        document.removeEventListener("mouseup", stopDragging);
    });
</script>

<div
    class="drag-handle absolute bottom-0 left-0 right-0 h-2 bg-gray-300 cursor-ns-resize hover:bg-gray-400 transition-colors"
    on:mousedown={startDragging}
/>

<style>
    .drag-handle {
        pointer-events: auto;
    }
</style>
