<script lang="ts">
    import type { Snippet } from "svelte";
    import { onMount } from "svelte";

    // A Svelte component that checks the visibility of its content within a specified parent element.
    // It uses the Intersection Observer API to monitor visibility changes and calls a callback function when the inner content becomes visible or invisible.

    let divElement: HTMLElement;

    interface Props {
        // Used for menu buttons.
        parent: HTMLElement;
        onVisibilityChange?: (isVisible: boolean) => void;
        isVisible?: boolean;
        children?: Snippet;
    }

    let { parent, onVisibilityChange = () => {}, isVisible = true, children }: Props = $props();

    onMount(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    isVisible = entry.isIntersecting;
                    onVisibilityChange(isVisible);
                });
            },
            {
                root: parent,
                threshold: 1,
            },
        );

        observer.observe(divElement);

        return () => {
            observer.disconnect();
        };
    });
</script>

<div class="group/visibilitychecker" class:visible={isVisible} class:invisible={!isVisible} bind:this={divElement}>
    {@render children?.()}
</div>
