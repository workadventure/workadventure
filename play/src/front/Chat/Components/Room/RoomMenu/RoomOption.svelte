<script lang="ts">
    import type { ComponentType } from "svelte";
    import { createEventDispatcher } from "svelte";

    export let IconComponent: ComponentType;
    export let title: string;
    /** Optional second line, e.g. a small colored tag (see {@link tagText}). */
    export let tagText: string | undefined = undefined;
    export let dataTestId: string | undefined = undefined;
    export let bg = "hover:bg-white/10";
    export let disabled = false;
    const dispatch = createEventDispatcher<{
        click: void;
    }>();
</script>

<button
    class="flex gap-2 {tagText ? 'items-start' : 'items-center'} {bg} m-0 p-2 w-full text-sm rounded text-left"
    data-testid={dataTestId}
    on:click|stopPropagation|preventDefault={() => dispatch("click")}
    {disabled}
>
    <div class="flex shrink-0 {tagText ? 'pt-0.5' : ''}">
        <svelte:component this={IconComponent} />
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
