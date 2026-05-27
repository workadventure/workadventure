<script lang="ts" generics="T extends object">
    import type { Snippet } from "svelte";
    import LL from "../../../i18n/i18n-svelte";

    interface Props<T extends object> {
        items: T[];
        maxNumber?: number;
        idKey?: keyof T;
        showNothingToDisplayMessage?: boolean;
        children?: Snippet<[{ item: T }]>;
    }

    let {
        items,
        maxNumber = 8,
        idKey = "id" as keyof T,
        showNothingToDisplayMessage = true,
        children,
    }: Props<T> = $props();

    let showMore = $state(false);
    let filteredItems = $derived(showMore ? items : items.slice(0, maxNumber));
</script>

{#each filteredItems as item (item[idKey])}
    {@render children?.({ item })}
{/each}
{#if items.length > 8}
    <div class="flex justify-center">
        <button
            class="flex-col p-0 m-0 text-gray-400 text-center w-full text-sm"
            onclick={() => (showMore = !showMore)}
        >
            {showMore ? $LL.chat.showLess() : $LL.chat.showMore({ number: items.length - 8 })}
        </button>
    </div>
{/if}
{#if showNothingToDisplayMessage && items.length === 0}
    <p class="pt-1.5 pb-3 px-3 m-0 text-white/50 italic">{$LL.chat.nothingToDisplay()}</p>
{/if}
