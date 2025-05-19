<script lang="ts">
    import { onDestroy, onMount } from "svelte";

    export let minWidth: number;
    export let maxWidth: number;
    export let currentWidth: number;
    export let onResize: (width: number) => void;

    let dragHandle: HTMLElement;

    let isDragging = false;
    let startX: number;
    let startWidth: number;

    const startDragging = (e: MouseEvent | TouchEvent) => {
        isDragging = true;
        startX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
        startWidth = currentWidth;

        document.addEventListener("mousemove", handleDragging, { passive: true });
        document.addEventListener("mouseup", stopDragging, { passive: true });
        document.addEventListener("touchmove", handleDragging, { passive: true });
        document.addEventListener("touchend", stopDragging, { passive: true });
    };

    function handleDragging(e: MouseEvent | TouchEvent) {
        if (!isDragging) return;

        const clientX = e instanceof MouseEvent ? e.clientX : e.touches[0].clientX;
        let deltaX = startX - clientX;
        if (document.documentElement.dir === "rtl") {
            deltaX = -deltaX;
        }
        const newWidth = startWidth + deltaX;
        onResize(Math.min(Math.max(newWidth, minWidth), maxWidth));
    }

    function stopDragging() {
        isDragging = false;
        document.removeEventListener("mousemove", handleDragging);
        document.removeEventListener("mouseup", stopDragging);
        document.removeEventListener("touchmove", handleDragging);
        document.removeEventListener("touchend", stopDragging);
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
    class="relative drag-handle my-auto mr-3 w-1 h-20 outline outline-4 outline-contrast bg-white cursor-col-resize transition-colors rounded-lg select-none"
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
        inset-inline-start: -20px;
        width: 45px;
        height: 122px;
        /*background-color: rgba(255, 0, 0, 0.5);*/
        border-radius: 4px;
    }
</style>
