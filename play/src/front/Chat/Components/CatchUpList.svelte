<script lang="ts">
    import { get } from "svelte/store";
    import LL, { locale } from "../../../i18n/i18n-svelte";
    import type { UnreadConversation } from "../Stores/UnreadMessagesCountStore";
    import getCloseImg from "../images/get-close.png";
    import Avatar from "./Avatar.svelte";
    import LastMessagePreview from "./LastMessagePreview.svelte";
    import UnreadCount from "./UnreadCount.svelte";
    import { openConversation } from "./Room/selectProximityRoom";
    import { formatLastActivity } from "./unreadCount";

    interface Props {
        conversations: UnreadConversation[];
    }

    let { conversations }: Props = $props();
</script>

{#if conversations.length === 0}
    <div class="flex flex-col flex-1 ps-4 items-center pt-8" data-testid="chatCatchUpEmpty">
        <div class="text-center px-3 max-w-md">
            <img class="mx-auto" src={getCloseImg} alt={$LL.chat.getCloserTitle()} draggable="false" />
            <div class="text-lg font-bold text-center">{$LL.chat.catchUpEmpty()}</div>
            <div class="text-sm opacity-50 text-center">
                {$LL.chat.noRoomOpenDescription()}
            </div>
        </div>
    </div>
{:else}
    <div class="flex flex-col min-w-0 overflow-y-auto p-4" data-testid="chatCatchUp">
        <h2 class="m-0 px-2 pb-2 text-xs font-bold uppercase tracking-widest text-white/60">
            {$LL.chat.catchUpTitle()}
        </h2>
        <ul class="list-none m-0 p-0 max-w-2xl">
            {#each conversations as item (item.conversation.id)}
                {@const name = get(item.conversation.name)}
                <li>
                    <button
                        type="button"
                        class="flex w-full items-center gap-3 rounded m-0 px-2 py-2 text-start bg-transparent border-none text-white hover:bg-white/10 focus-visible:bg-white/10 cursor-pointer"
                        onclick={() => openConversation(item.conversation)}
                    >
                        <Avatar compact pictureStore={item.conversation.pictureStore} fallbackName={name} />
                        <span class="min-w-0 flex-1">
                            <span class="flex items-baseline gap-2">
                                <span class="min-w-0 truncate text-sm font-bold">{name}</span>
                                {#if item.lastMessageTimestamp > 0}
                                    <span class="ms-auto shrink-0 text-xs text-white/50">
                                        {formatLastActivity(item.lastMessageTimestamp, new Date(), $locale)}
                                    </span>
                                {/if}
                            </span>
                            {#if item.conversation.lastMessagePreview}
                                <LastMessagePreview
                                    preview={item.conversation.lastMessagePreview}
                                    showSender={get(item.conversation.type) !== "direct"}
                                />
                            {/if}
                        </span>
                        <UnreadCount count={item.count} variant={item.mention ? "mention" : "default"} size="sm" />
                    </button>
                </li>
            {/each}
        </ul>
    </div>
{/if}
