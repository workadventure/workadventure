<script lang="ts">
    import { readable, type Readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatRoom, ChatThreadSummary } from "../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { selectedThreadStore } from "../../Stores/SelectedThreadStore";
    import RoomTimeline from "./RoomTimeline.svelte";
    import { IconMessageCircle2 } from "@wa-icons";

    export let room: ChatRoom;

    const emptyThreadSummaries = readable<readonly ChatThreadSummary[]>([]);

    function getThreadsStore(currentRoom: ChatRoom): Readable<readonly ChatThreadSummary[]> {
        return currentRoom.threads ?? emptyThreadSummaries;
    }

    async function openThread(rootMessageId: string) {
        const thread = await room.openThread?.(rootMessageId);
        if (!thread) {
            return;
        }

        selectedChatMessageToReply.set(null);
        selectedThreadStore.set(thread);
    }

    function showAllThreads() {
        selectedChatMessageToReply.set(null);
        selectedThreadStore.clear();
    }

    $: threadSummaries = getThreadsStore(room);
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="threadPanel">
    {#if $selectedThreadStore}
        <RoomTimeline
            room={$selectedThreadStore}
            backAction={showAllThreads}
            backButtonTestId="threadPanelBack"
            timelineTestId="threadPanelTimeline"
        />
    {:else}
        <div class="border border-solid border-x-0 border-t-0 border-white/10 px-4 py-5">
            <div class="text-sm font-bold tracking-widest uppercase opacity-75" data-testid="threadPanelTitle">
                {$LL.chat.thread.panelTitle()}
            </div>
        </div>

        <div class="flex-1 overflow-y-auto px-3 py-3" data-testid="threadPanelList">
            {#if $threadSummaries.length === 0}
                <div
                    class="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm opacity-60"
                    data-testid="threadPanelEmpty"
                >
                    {$LL.chat.thread.empty()}
                </div>
            {:else}
                <div class="flex flex-col gap-2">
                    {#each $threadSummaries as summary (summary.rootMessageId)}
                        <button
                            type="button"
                            class="m-0 rounded-lg border border-solid border-white/10 bg-white/5 px-3 py-3 text-left transition-colors hover:bg-white/10 {summary.hasUnreadMessages
                                ? 'font-bold ring-1 ring-success/40'
                                : ''}"
                            data-testid={`threadPanelItem-${summary.rootMessageId}`}
                            on:click={() => openThread(summary.rootMessageId)}
                        >
                            <div class="flex min-w-0 items-center gap-2">
                                <div class="truncate text-sm font-semibold text-white">
                                    {#if summary.rootMessageSenderName}{summary.rootMessageSenderName}:
                                    {/if}{summary.rootMessagePreview ?? $LL.chat.thread.defaultPreview()}
                                </div>
                                {#if summary.hasUnreadMessages}
                                    <span
                                        class="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-success px-1.5 text-xs font-bold text-contrast"
                                        data-testid={`threadPanelItemUnread-${summary.rootMessageId}`}
                                        aria-label={$LL.chat.thread.unreadAriaLabel({
                                            count: summary.unreadNotificationCount,
                                        })}
                                    >
                                        {summary.unreadNotificationCount > 9 ? "9+" : summary.unreadNotificationCount}
                                    </span>
                                {/if}
                            </div>
                            <div
                                class="mt-2 flex items-center gap-2 text-xs font-semibold opacity-75"
                                data-testid={`threadPanelItemCount-${summary.rootMessageId}`}
                            >
                                <IconMessageCircle2 font-size={14} />
                                <span
                                    >{summary.replyCount === 1
                                        ? $LL.chat.thread.replySingular()
                                        : $LL.chat.thread.replyPlural({ count: summary.replyCount })}</span
                                >
                            </div>
                            {#if summary.lastReplyPreview}
                                <div class="mt-2 truncate text-xs opacity-60">
                                    {#if summary.lastReplySenderName}{summary.lastReplySenderName}:
                                    {/if}{summary.lastReplyPreview}
                                </div>
                            {/if}
                        </button>
                    {/each}
                </div>
            {/if}
        </div>
    {/if}
</div>
