<script lang="ts">
    import { get } from "svelte/store";
    import { onDestroy } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL, { locale } from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue } from "../Stores/ChatStore";
    import { selectedRoomStore } from "../Stores/SelectRoomStore";
    import { roomSidePanelStore } from "../Stores/RoomSidePanelStore";
    import { collectFolderRooms, searchLoadedMessages, type MessageSearchResult } from "./MessageSearch";

    /** Wait for the user to pause: each search walks every loaded message of every room. */
    const SEARCH_DEBOUNCE_MS = 300;

    const chat = gameManager.chatConnection;
    const proximityRooms = gameManager.getCurrentGameScene().proximityChatRoomManager.roomsStore;

    let results: MessageSearchResult[] = $state([]);
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    $effect(() => {
        const query = $chatSearchBarValue;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            // Read with get(): a new message in any room must not rerun the search, only the query does.
            results = searchLoadedMessages(
                [
                    ...get(proximityRooms),
                    ...get(chat.directRooms),
                    ...get(chat.rooms),
                    ...collectFolderRooms(get(chat.folders)),
                ],
                query,
            );
        }, SEARCH_DEBOUNCE_MS);
    });

    onDestroy(() => clearTimeout(debounceTimer));

    function openResult({ room, message }: MessageSearchResult) {
        selectedRoomStore.set(room);
        roomSidePanelStore.focusTimelineEvent(room.id, message.id);
    }
</script>

{#if results.length > 0 && $chatSearchBarValue.trim() !== ""}
    <div
        class="px-2 pb-2 border border-solid border-x-0 border-t border-b-0 border-white/10"
        data-testid="messageSearchResults"
    >
        <div class="px-1 pt-3 text-white text-sm font-bold tracking-widest uppercase">
            {$LL.chat.messageSearch.title()}
        </div>
        <p class="px-1 m-0 mb-1 text-xs text-white/50">{$LL.chat.messageSearch.loadedOnly()}</p>
        {#each results as result (`${result.room.id}/${result.message.id}`)}
            <button
                type="button"
                class="w-full m-0 px-2 py-1.5 rounded text-start bg-transparent hover:bg-white/10 flex flex-col gap-0.5"
                data-testid="messageSearchResult"
                onclick={() => openResult(result)}
            >
                <span class="w-full flex items-baseline gap-2 text-sm">
                    <span class="font-bold text-white truncate grow">{get(result.room.name)}</span>
                    {#if result.message.date}
                        <span class="text-xs text-white/50 shrink-0">
                            {result.message.date.toLocaleString($locale, { dateStyle: "short", timeStyle: "short" })}
                        </span>
                    {/if}
                </span>
                <span class="w-full text-xs text-white/75 truncate">
                    <span class="font-bold"
                        >{result.message.isMyMessage ? $LL.chat.you() : result.message.sender?.username}</span
                    >
                    · {result.before}<span class="text-light-blue font-bold">{result.match}</span>{result.after}
                </span>
            </button>
        {/each}
    </div>
{/if}
