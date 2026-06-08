<script lang="ts">
    import { onMount } from "svelte";
    import { readable, type Readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatRoom, ChatRoomSidePanelHydrationState, ChatThreadSummary } from "../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../Stores/ChatStore";
    import { selectedThreadStore } from "../../Stores/SelectedThreadStore";
    import { toastStore } from "../../../Stores/ToastStore";
    import TextToast from "../../../Components/Toasts/TextToast.svelte";
    import RoomTimeline from "./RoomTimeline.svelte";
    import { IconLoader, IconMessageCircle2 } from "@wa-icons";

    interface Props {
        room: ChatRoom;
    }

    let { room }: Props = $props();

    const emptyThreadSummaries = readable<readonly ChatThreadSummary[]>([]);
    const idleHydrationState = readable<ChatRoomSidePanelHydrationState>({ status: "idle" });

    onMount(() => {
        room.ensureThreadsHydrated?.().catch((error) => console.error("Failed to hydrate thread panel", error));
    });

    function getThreadsStore(currentRoom: ChatRoom): Readable<readonly ChatThreadSummary[]> {
        return currentRoom.threads ?? emptyThreadSummaries;
    }

    function retryThreadsHydration() {
        room.ensureThreadsHydrated?.().catch((error) => console.error("Failed to retry thread hydration", error));
    }

    async function openThread(rootMessageId: string) {
        const thread = await room.openThread?.(rootMessageId);
        if (!thread) {
            toastStore.addToast(TextToast, { message: $LL.chat.thread.openError() }, undefined);
            return;
        }

        selectedChatMessageToReply.set(null);
        selectedThreadStore.set(thread);
    }

    function showAllThreads() {
        selectedChatMessageToReply.set(null);
        selectedThreadStore.clear();
    }

    let threadSummaries = $derived(getThreadsStore(room));
    let threadHydrationState = $derived(room.threadsHydrationState ?? idleHydrationState);
    let threadWarnings = $derived($threadHydrationState.warnings ?? []);
    let hasUnsupportedThreadHistory = $derived(
        threadWarnings.some((warning) => warning.reason === "server_unsupported"),
    );
    let degradedThreadWarning = $derived(threadWarnings.find((warning) => warning.reason === "thread_root_missing"));
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
            {#if $threadHydrationState.status === "loading" || $threadHydrationState.status === "idle"}
                <div
                    class="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm opacity-60"
                    data-testid="threadPanelLoading"
                >
                    <div class="flex items-center justify-center text-white/80">
                        <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={24} />
                    </div>
                </div>
            {:else if $threadHydrationState.status === "error"}
                <div
                    class="rounded-lg border border-solid border-danger-900/50 bg-danger-900/20 px-4 py-4 text-sm text-white/85"
                >
                    <div data-testid="threadPanelError">{$LL.chat.roomPanel.threadsLoadError()}</div>
                    <button
                        type="button"
                        class="m-0 mt-3 rounded-lg border border-solid border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                        data-testid="threadPanelRetry"
                        onclick={retryThreadsHydration}
                    >
                        {$LL.chat.roomPanel.status.retry()}
                    </button>
                </div>
            {:else}
                {#if hasUnsupportedThreadHistory}
                    <div
                        class="mb-3 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-white/70"
                        data-testid="threadPanelPartialHistory"
                    >
                        {$LL.chat.thread.partialHistory()}
                    </div>
                {/if}

                {#if degradedThreadWarning?.count}
                    <div
                        class="mb-3 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-white/70"
                        data-testid="threadPanelDegradedWarning"
                    >
                        {$LL.chat.thread.degradedListWarning({ count: degradedThreadWarning.count })}
                    </div>
                {/if}

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
                                onclick={() => openThread(summary.rootMessageId)}
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
                                            {summary.unreadNotificationCount > 9
                                                ? "9+"
                                                : summary.unreadNotificationCount}
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
                                {#if summary.isDegraded}
                                    <div class="mt-2 text-xs text-white/55">
                                        {$LL.chat.thread.degradedBadge()}
                                    </div>
                                {/if}
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
            {/if}
        </div>
    {/if}
</div>
