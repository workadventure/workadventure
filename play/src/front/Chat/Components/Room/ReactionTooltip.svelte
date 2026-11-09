<script lang="ts">
    import type { Readable } from "svelte/store";

    interface Props {
        text: Readable<string>;
    }

    let { text }: Props = $props();
</script>

<div
    role="tooltip"
    class="max-w-[240px] bg-contrast/90 backdrop-blur-xl text-white p-2 rounded text-sm border border-solid border-white/10 shadow-lg"
>
    {$text}
</div>
