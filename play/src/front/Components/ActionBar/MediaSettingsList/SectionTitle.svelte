<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        title?: string;
        children?: Snippet;
        actions?: Snippet;
    }

    let { title = "", children, actions }: Props = $props();
</script>

<div class="flex items-center justify-between text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold">
    <span>
        {title}
        {@render children?.()}
    </span>
    {@render actions?.()}
</div>
