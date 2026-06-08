<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();
</script>

<div class="bg-danger-1200 border border-solid border-danger text-danger-800 rounded p-2 inline-block text-sm">
    {@render children?.()}
</div>
