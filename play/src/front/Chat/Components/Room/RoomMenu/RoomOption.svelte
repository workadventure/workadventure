<script lang="ts">
    import type { WorkAdventureComponent } from "../../../../../types/component";

    interface Props {
        IconComponent: WorkAdventureComponent;
        title: string;
        /** Optional second line, e.g. a small colored tag (see {@link tagText}). */
        tagText?: string;
        dataTestId?: string;
        bg?: string;
        disabled?: boolean;
        onclick?: () => void;
    }

    let {
        IconComponent,
        title,
        tagText = undefined,
        dataTestId = undefined,
        bg = "hover:bg-white/10",
        disabled = false,
        onclick,
    }: Props = $props();
</script>

<button
    class="flex gap-2 {tagText ? 'items-start' : 'items-center'} {bg} m-0 p-2 w-full text-sm rounded text-left"
    data-testid={dataTestId}
    onclick={(event) => {
        event.stopPropagation();
        event.preventDefault();
        onclick?.();
    }}
    {disabled}
>
    <div class="flex shrink-0 {tagText ? 'pt-0.5' : ''}">
        <IconComponent />
    </div>
    {#if tagText}
        <div class="flex min-w-0 flex-col gap-1">
            <span class="leading-snug">{title}</span>
            <span
                class="inline-flex w-fit rounded-md bg-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-200"
                >{tagText}</span
            >
        </div>
    {:else}
        <span>{title}</span>
    {/if}
</button>
