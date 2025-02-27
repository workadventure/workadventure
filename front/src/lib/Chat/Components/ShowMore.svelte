<script lang="ts">
    import LL from "../../../i18n/i18n-svelte";

    // When generics are available, use them instead of "any"
    // See https://www.reddit.com/r/sveltejs/comments/t10qgb/help_typing_generics_for_slot_props/
    //eslint-disable-next-line @typescript-eslint/no-explicit-any
    export let items: any[];
    export let maxNumber = 8;
    export let idKey = "id";
    export let showNothingToDisplayMessage = true;

    let showMore = false;
    $: filteredItems = showMore ? items : items.slice(0, maxNumber);
</script>

{#each filteredItems as item (item[idKey])}
    <slot {item} />
{/each}
{#if items.length > 8}
    <div class="flex justify-center">
        <button
            class="flex-col p-0 m-0 text-gray-400 text-center w-full text-sm"
            on:click={() => (showMore = !showMore)}
        >
            {showMore ? $LL.chat.showLess() : $LL.chat.showMore({ number: items.length - 8 })}
        </button>
    </div>
{/if}
{#if showNothingToDisplayMessage && items.length === 0}
    <p class="pt-1.5 pb-3 px-3 m-0 text-white/50 italic">{$LL.chat.nothingToDisplay()}</p>
{/if}
