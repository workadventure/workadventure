<script lang="ts">
    import { onMount } from "svelte";

    export let parent: HTMLElement;
    export let onVisibilityChange: (isVisible: boolean) => void = () => {};
    let divElement: HTMLElement;

    export let isVisible = true;

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
            }
        );

        observer.observe(divElement);

        return () => {
            observer.disconnect();
        };
    });
</script>

<div class="group/visibilitychecker" class:visible={isVisible} class:invisible={!isVisible} bind:this={divElement}>
    <slot />
</div>
