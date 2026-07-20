<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        id?: string;
        align?: "left" | "right";
        children?: Snippet;
    }

    let { id = undefined, align = "left", children }: Props = $props();
</script>

<div {id} class="px-3 mt-1 text-xs text-white opacity-50" class:text-right={align === "right"}>
    {@render children?.()}
</div>
