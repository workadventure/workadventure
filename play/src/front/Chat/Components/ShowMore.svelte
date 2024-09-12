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
    <div class="tw-flex tw-justify-center">
        <button
            class="tw-flex-col tw-p-0 tw-m-0 tw-text-gray-400 tw-text-center tw-w-full tw-text-sm"
            on:click={() => (showMore = !showMore)}
        >
            {showMore ? $LL.chat.showLess() : $LL.chat.showMore({ number: items.length - 8 })}
        </button>
    </div>
{/if}
{#if showNothingToDisplayMessage && items.length === 0}
    <p class="tw-p-0 tw-m-0 tw-text-center tw-text-gray-300">{$LL.chat.nothingToDisplay()}</p>
{/if}
