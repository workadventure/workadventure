<script lang="ts">
    import { get } from "svelte/store";
    import LL from "../../../i18n/i18n-svelte";
    import type { UnreadConversation } from "../Stores/UnreadMessagesCountStore";
    import Avatar from "./Avatar.svelte";
    import UnreadCount from "./UnreadCount.svelte";
    import { openConversation } from "./Room/selectProximityRoom";

    interface Props {
        conversations: UnreadConversation[];
        onSelect: () => void;
    }

    let { conversations, onSelect }: Props = $props();

    function open({ conversation }: UnreadConversation) {
        openConversation(conversation);
        onSelect();
    }
</script>

<div
    class="bg-contrast/90 backdrop-blur rounded-lg p-1 w-60 text-white select-none border border-solid border-white/10"
    data-testid="unreadConversationsPopover"
>
    <div class="px-2 py-1 text-xs font-bold uppercase tracking-widest text-white/60">
        {$LL.chat.unreadConversationsTitle()}
    </div>
    <ul class="list-none m-0 p-0 max-h-80 overflow-y-auto">
        {#each conversations as item (item.conversation.id)}
            {@const name = get(item.conversation.name)}
            <li>
                <button
                    type="button"
                    class="flex w-full items-center gap-2 rounded px-2 py-1.5 text-start hover:bg-white/10 focus-visible:bg-white/10"
                    onclick={() => open(item)}
                >
                    <Avatar compact pictureStore={item.conversation.pictureStore} fallbackName={name} />
                    <span class="min-w-0 flex-1 truncate text-sm font-bold">{name}</span>
                    <UnreadCount count={item.count} variant={item.mention ? "mention" : "default"} size="sm" />
                </button>
            </li>
        {/each}
    </ul>
</div>
