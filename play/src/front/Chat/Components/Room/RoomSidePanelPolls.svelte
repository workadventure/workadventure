<script lang="ts">
    import { onMount, tick } from "svelte";
    import { get, readable, type Readable } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatPollItem, ChatRoom, ChatRoomSidePanelHydrationState } from "../../Connection/ChatConnection";
    import { selectedThreadStore } from "../../Stores/SelectedThreadStore";
    import { roomSidePanelStore } from "../../Stores/RoomSidePanelStore";
    import { toastStore } from "../../../Stores/ToastStore";
    import TextToast from "../../../Components/Toasts/TextToast.svelte";
    import RoomSidePanelPollItem from "./RoomSidePanelPollItem.svelte";
    import { IconLoader } from "@wa-icons";

    interface Props {
        room: ChatRoom;
        closeOnTimelineFocus: boolean;
    }

    let { room, closeOnTimelineFocus = false }: Props = $props();

    const emptyPollItems = readable<readonly ChatPollItem[]>([]);
    const idleHydrationState = readable<ChatRoomSidePanelHydrationState>({ status: "idle" });

    onMount(() => {
        room.ensurePollRichHydrated?.().catch((error) => console.error("Failed to hydrate polls side panel", error));
    });

    async function focusPoll(poll: ChatPollItem) {
        if (poll.context.kind === "thread") {
            const thread = await room.openThread?.(poll.context.threadRootMessageId);
            if (!thread) {
                toastStore.addToast(TextToast, { message: $LL.chat.thread.openError() }, undefined);
                return;
            }

            selectedThreadStore.set(thread);
            roomSidePanelStore.setActiveSection("threads");

            const canFocusThreadPoll = (await thread.ensureTimelineEventVisible?.(poll.id)) ?? true;
            if (!canFocusThreadPoll) {
                toastStore.addToast(TextToast, { message: $LL.chat.roomPanel.pollFocusError() }, undefined);
                return;
            }

            await tick();
            roomSidePanelStore.focusTimelineEvent(thread.id, poll.id);
            return;
        }

        const canFocusRoomPoll = (await room.ensureTimelineEventVisible?.(poll.id)) ?? true;
        if (!canFocusRoomPoll) {
            toastStore.addToast(TextToast, { message: $LL.chat.roomPanel.pollFocusError() }, undefined);
            return;
        }

        if (closeOnTimelineFocus) {
            roomSidePanelStore.close();
            await tick();
        }

        roomSidePanelStore.focusTimelineEvent(room.id, poll.id);
    }

    function retryPollRichHydration() {
        room.ensurePollRichHydrated?.().catch((error) => console.error("Failed to retry poll rich hydration", error));
    }

    function getPollItemsStore(currentRoom: ChatRoom): Readable<readonly ChatPollItem[]> {
        return currentRoom.pollItems ?? emptyPollItems;
    }

    let pollItems = $derived(getPollItemsStore(room));
    let pollRichHydrationState = $derived(room.pollRichHydrationState ?? idleHydrationState);
    let richWarnings = $derived($pollRichHydrationState.warnings ?? []);
    let pollItemErrorWarning = $derived(richWarnings.find((warning) => warning.reason === "poll_item_error"));
    let polls = $derived(
        [...$pollItems].sort((left, right) => {
            const leftState = get(left.state);
            const rightState = get(right.state);

            if (leftState.isEnded !== rightState.isEnded) {
                return leftState.isEnded ? 1 : -1;
            }

            return (right.date?.getTime() ?? 0) - (left.date?.getTime() ?? 0);
        }),
    );
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanelPolls">
    <div class="border border-solid border-x-0 border-t-0 border-white/10 px-4 py-5">
        <div class="text-sm font-bold tracking-widest uppercase opacity-75">
            {$LL.chat.roomPanel.sections.polls()}
        </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-3">
        {#if $pollRichHydrationState.status === "loading" || $pollRichHydrationState.status === "idle"}
            <div
                class="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm opacity-60"
                data-testid="roomSidePanelPollsLoading"
            >
                <div class="flex items-center justify-center text-white/80">
                    <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={24} />
                </div>
            </div>
        {:else if $pollRichHydrationState.status === "error"}
            <div
                class="rounded-lg border border-solid border-danger-900/50 bg-danger-900/20 px-4 py-4 text-sm text-white/85"
            >
                <div data-testid="roomSidePanelPollsError">{$LL.chat.roomPanel.pollsLoadError()}</div>
                <button
                    type="button"
                    class="m-0 mt-3 rounded-lg border border-solid border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-white/80 transition-colors hover:bg-white/10 hover:text-white"
                    data-testid="roomSidePanelPollsRetry"
                    onclick={retryPollRichHydration}
                >
                    {$LL.chat.roomPanel.status.retry()}
                </button>
            </div>
        {:else}
            {#if pollItemErrorWarning?.count}
                <div
                    class="mb-3 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-xs text-white/70"
                    data-testid="roomSidePanelPollsPartial"
                >
                    {$LL.chat.roomPanel.pollsPartial()}
                </div>
            {/if}

            {#if polls.length === 0}
                <div
                    class="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm opacity-60"
                    data-testid="roomSidePanelPollsEmpty"
                >
                    {$LL.chat.roomPanel.pollsEmpty()}
                </div>
            {:else}
                <div class="flex flex-col gap-2">
                    {#each polls as poll (poll.id)}
                        <div
                            class="rounded-lg border border-solid border-white/10 bg-white/[0.03] px-3 py-3 text-left"
                            data-testid="roomSidePanelPollItem"
                        >
                            <RoomSidePanelPollItem {poll} onFocusPoll={() => focusPoll(poll)} />
                        </div>
                    {/each}
                </div>
            {/if}
        {/if}
    </div>
</div>
