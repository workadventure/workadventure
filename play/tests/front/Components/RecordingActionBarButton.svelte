<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        tooltipTitle?: string;
        media?: string;
        tooltip?: Snippet;
        children?: Snippet;
        wrapperDiv?: HTMLElement;
    }

    let { tooltipTitle, media, tooltip, children, wrapperDiv = $bindable() }: Props = $props();
</script>

<div bind:this={wrapperDiv}>
    <h1>{tooltipTitle}</h1>
    {#if media}
        <div data-help-media={media}></div>
    {/if}
    {@render children?.()}
    {@render tooltip?.()}
</div>
