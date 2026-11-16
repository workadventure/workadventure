<script lang="ts">
    import type { Snippet } from "svelte";
    import { IconChevronRight } from "@wa-icons";

    interface Props {
        title: string;
        description: string;
        dataTestId: string;
        icon: Snippet;
        onclick: () => void;
    }

    let { title, description, dataTestId, icon, onclick }: Props = $props();
</script>

<button
    type="button"
    data-testid={dataTestId}
    class="w-full flex items-center gap-4 p-4 m-0 text-start text-white rounded-xl bg-white/5 hover:bg-white/10 border border-solid border-white/20 cursor-pointer appearance-none transition-colors"
    {onclick}
>
    <span
        class="w-11 h-11 shrink-0 rounded-[10px] bg-secondary/25 text-secondary-400 flex items-center justify-center"
        aria-hidden="true"
    >
        {@render icon()}
    </span>
    <span class="flex flex-col gap-1 grow min-w-0">
        <span class="text-lg font-bold">{title}</span>
        <span class="text-sm text-white/70">{description}</span>
    </span>
    <IconChevronRight class="shrink-0 text-white/60" font-size="20" />
</button>
