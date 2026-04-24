<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration } from "../../Connection/ChatConnection";
    import { roomSidePanelStore, type RoomSidePanelSection } from "../../Stores/RoomSidePanelStore";
    import ThreadPanel from "./ThreadPanel.svelte";
    import RoomSidePanelParticipants from "./RoomSidePanelParticipants.svelte";
    import RoomSidePanelPolls from "./RoomSidePanelPolls.svelte";
    import { IconCheckList, IconMessageCircle2, IconUsersGroup, IconX } from "@wa-icons";

    export let room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration;
    export let showCloseButton = false;
    export let closeOnTimelineFocus = false;

    function activateSection(section: RoomSidePanelSection) {
        roomSidePanelStore.setActiveSection(section);
    }
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanel">
    <div class="border border-solid border-x-0 border-t-0 border-white/10 px-3 py-3">
        <div class="flex items-center gap-2">
            <div class="grid min-w-0 flex-1 grid-cols-3 gap-2">
                <button
                    type="button"
                    class="m-0 flex min-w-0 items-center justify-center gap-2 rounded-lg border border-solid px-3 py-2 text-sm font-semibold transition-colors {$roomSidePanelStore.activeSection ===
                    'threads'
                        ? 'border-white/20 bg-white/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}"
                    data-testid="roomSidePanelTab-threads"
                    on:click={() => activateSection("threads")}
                >
                    <IconMessageCircle2 class="shrink-0" font-size={16} />
                    <span class="truncate">{$LL.chat.roomPanel.sections.threads()}</span>
                </button>

                <button
                    type="button"
                    class="m-0 flex min-w-0 items-center justify-center gap-2 rounded-lg border border-solid px-3 py-2 text-sm font-semibold transition-colors {$roomSidePanelStore.activeSection ===
                    'polls'
                        ? 'border-white/20 bg-white/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}"
                    data-testid="roomSidePanelTab-polls"
                    on:click={() => activateSection("polls")}
                >
                    <IconCheckList class="shrink-0" font-size={16} />
                    <span class="truncate">{$LL.chat.roomPanel.sections.polls()}</span>
                </button>

                <button
                    type="button"
                    class="m-0 flex min-w-0 items-center justify-center gap-2 rounded-lg border border-solid px-3 py-2 text-sm font-semibold transition-colors {$roomSidePanelStore.activeSection ===
                    'participants'
                        ? 'border-white/20 bg-white/15 text-white'
                        : 'border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white'}"
                    data-testid="roomSidePanelTab-participants"
                    on:click={() => activateSection("participants")}
                >
                    <IconUsersGroup class="shrink-0" font-size={16} />
                    <span class="truncate">{$LL.chat.roomPanel.sections.participants()}</span>
                </button>
            </div>

            {#if showCloseButton}
                <button
                    type="button"
                    class="m-0 flex aspect-square h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-solid border-white/10 bg-white/5 text-white transition-colors hover:bg-white/10"
                    data-testid="closeRoomSidePanelButton"
                    title={$LL.chat.roomPanel.toggleClose()}
                    aria-label={$LL.chat.roomPanel.toggleClose()}
                    on:click={() => roomSidePanelStore.close()}
                >
                    <IconX font-size={18} />
                </button>
            {/if}
        </div>
    </div>

    <div class="min-h-0 flex-1 overflow-hidden">
        {#if $roomSidePanelStore.activeSection === "threads"}
            <ThreadPanel {room} />
        {:else if $roomSidePanelStore.activeSection === "participants"}
            <RoomSidePanelParticipants {room} />
        {:else}
            <RoomSidePanelPolls {room} {closeOnTimelineFocus} />
        {/if}
    </div>
</div>
