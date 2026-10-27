<script lang="ts" generics="T extends object">
    import type { Snippet } from "svelte";
    import type { Readable } from "svelte/store";
    import { derived, readable } from "svelte/store";
    import LL from "../../../i18n/i18n-svelte";
    import UnreadCount from "./UnreadCount.svelte";
    import { hiddenUnreadCount } from "./showMoreUnread";

    interface Props<T extends object> {
        items: T[];
        maxNumber?: number;
        idKey?: keyof T;
        showNothingToDisplayMessage?: boolean;
        /** When given, the "Show more" button shows how many unread messages the hidden items hold. */
        getUnreadCount?: (item: T) => Readable<number>;
        children?: Snippet<[{ item: T }]>;
    }

    let {
        items,
        maxNumber = 8,
        idKey = "id" as keyof T,
        showNothingToDisplayMessage = true,
        getUnreadCount,
        children,
    }: Props<T> = $props();

    let showMore = $state(false);
    let filteredItems = $derived(showMore ? items : items.slice(0, maxNumber));
    let hiddenUnread = $derived(
        getUnreadCount && items.length > maxNumber
            ? derived(items.map(getUnreadCount), (counts) => hiddenUnreadCount(counts, maxNumber))
            : readable(0),
    );
</script>

{#each filteredItems as item (item[idKey])}
    {@render children?.({ item })}
{/each}
{#if items.length > maxNumber}
    <div class="flex justify-center">
        <button
            class="flex items-center justify-center gap-1.5 p-0 m-0 text-gray-400 text-center w-full text-sm"
            onclick={() => (showMore = !showMore)}
        >
            {showMore ? $LL.chat.showLess() : $LL.chat.showMore({ number: items.length - maxNumber })}
            {#if !showMore && $hiddenUnread > 0}
                <UnreadCount
                    count={$hiddenUnread}
                    size="sm"
                    ariaLabel={$LL.chat.a11y.hiddenUnreadCount({ count: $hiddenUnread })}
                />
            {/if}
        </button>
    </div>
{/if}
{#if showNothingToDisplayMessage && items.length === 0}
    <p class="pt-1.5 pb-3 px-3 m-0 text-white/50 italic">{$LL.chat.nothingToDisplay()}</p>
{/if}
