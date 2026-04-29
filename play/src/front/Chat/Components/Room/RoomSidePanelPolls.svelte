<script lang="ts">
    import { tick } from "svelte";
    import { readable, type Readable } from "svelte/store";
    import { get } from "svelte/store";
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatPollItem, ChatRoom } from "../../Connection/ChatConnection";
    import { selectedThreadStore } from "../../Stores/SelectedThreadStore";
    import { roomSidePanelStore } from "../../Stores/RoomSidePanelStore";
    import RoomSidePanelPollItem from "./RoomSidePanelPollItem.svelte";

    export let room: ChatRoom;
    export let closeOnTimelineFocus = false;

    const emptyPollItems = readable<readonly ChatPollItem[]>([]);

    $: timelineItems = room.timelineItems;

    async function focusPoll(poll: ChatPollItem) {
        if (poll.context.kind === "thread") {
            const thread = await room.openThread?.(poll.context.threadRootMessageId);
            if (!thread) {
                return;
            }

            selectedThreadStore.set(thread);
            roomSidePanelStore.setActiveSection("threads");
            await tick();
            roomSidePanelStore.focusTimelineEvent(thread.id, poll.id);
            return;
        }

        if (closeOnTimelineFocus) {
            roomSidePanelStore.close();
            await tick();
        }

        roomSidePanelStore.focusTimelineEvent(room.id, poll.id);
    }

    function getPollItemsStore(currentRoom: ChatRoom): Readable<readonly ChatPollItem[]> {
        return currentRoom.pollItems ?? emptyPollItems;
    }

    $: pollItems = getPollItemsStore(room);
    $: timelinePolls = $timelineItems
        .filter(
            (item): item is { kind: "poll"; id: string; date: Date | null; poll: ChatPollItem } => item.kind === "poll"
        )
        .map((item) => item.poll);
    $: pollSource = $pollItems.length > 0 ? $pollItems : timelinePolls;
    $: polls = [...pollSource].sort((left, right) => {
        const leftState = get(left.state);
        const rightState = get(right.state);

        if (leftState.isEnded !== rightState.isEnded) {
            return leftState.isEnded ? 1 : -1;
        }

        return (right.date?.getTime() ?? 0) - (left.date?.getTime() ?? 0);
    });
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanelPolls">
    <div class="border border-solid border-x-0 border-t-0 border-white/10 px-4 py-5">
        <div class="text-sm font-bold tracking-widest uppercase opacity-75">
            {$LL.chat.roomPanel.sections.polls()}
        </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-3">
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
    </div>
</div>
