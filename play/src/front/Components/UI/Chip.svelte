<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        size?: "xs" | "sm";
        display?: "inline" | "inline-flex";
        class?: string;
        children?: Snippet;
    }

    let { size = "sm", display = "inline", class: className = "", children }: Props = $props();
</script>

<span class={`chip chip-${size} chip-neutral ${display} items-center rounded-sm ${className}`}>
    <span class="chip-label inline-flex items-center leading-none">{@render children?.()}</span>
</span>
