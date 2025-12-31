<script lang="ts">
    import { onMount } from "svelte";
    import MediaBox from "../Video/MediaBox.svelte";
    import type { VideoBox } from "../../Space/Space";
    import { oneLineStreamableCollectionStore } from "../../Stores/OneLineStreamableCollectionStore";
    import type { ObservableElement } from "../../Interfaces/ObservableElement";

    export let videoBox: VideoBox;
    export let isOnOneLine: boolean;
    export let oneLineMode: "vertical" | "horizontal";
    export let videoWidth: number;
    export let videoHeight: number | undefined;
    export let intersectionObserver: IntersectionObserver | undefined;

    let isVisible = !intersectionObserver;
    let videoBoxElement: HTMLDivElement | undefined;

    const orderStore = videoBox.displayOrder;

    $: isFirst = $orderStore === 0;

    $: isLast = $orderStore === $oneLineStreamableCollectionStore.length - 1;

    onMount(() => {
        if (!videoBoxElement) {
            return;
        }

        // Attach the visibility callback to the element
        const observableElement = videoBoxElement as ObservableElement;
        observableElement.visibilityCallback = (visibility: boolean) => {
            isVisible = visibility;
        };

        return () => {
            if (videoBoxElement) {
                intersectionObserver?.unobserve(videoBoxElement);
            }
        };
    });

    let oldIntersectionObserver: IntersectionObserver | undefined = undefined;

    $: {
        if (videoBoxElement && oldIntersectionObserver !== intersectionObserver) {
            oldIntersectionObserver?.unobserve(videoBoxElement);
            oldIntersectionObserver = intersectionObserver;
            intersectionObserver?.observe(videoBoxElement);
            if (!intersectionObserver) {
                isVisible = true;
            }
        }
    }
</script>

<div
    bind:this={videoBoxElement}
    style={`order: ${$orderStore}; width: ${videoWidth}px; max-width: ${videoWidth}px;${
        videoHeight ? `height: ${videoHeight}px; max-height: ${videoHeight}px;` : ""
    }`}
    class={` overflow-hidden
    ${
        isOnOneLine
            ? oneLineMode === "horizontal"
                ? `pointer-events-auto basis-40 shrink-0 min-w-40 grow camera-box ${isFirst ? "ml-auto" : ""} ${
                      isLast ? "mr-auto" : ""
                  }`
                : "pointer-events-auto basis-40 shrink-0 min-h-24 grow camera-box"
            : "pointer-events-auto shrink-0 camera-box"
    }`}
    class:aspect-video={videoHeight === undefined}
>
    {#if isVisible}
        <MediaBox {videoBox} />
    {/if}
</div>
