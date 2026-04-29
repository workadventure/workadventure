<script lang="ts">
    import { get } from "svelte/store";
    import { openModal } from "svelte-modals";
    import LL from "../../../../i18n/i18n-svelte";
    import type { ChatRoom, ChatRoomMembershipManagement, ChatRoomModeration } from "../../Connection/ChatConnection";
    import ManageParticipantsModal from "./ManageParticipantsModal.svelte";
    import RoomSidePanelParticipantRow from "./RoomSidePanelParticipantRow.svelte";

    export let room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration;

    $: members = room.members;
    $: canInvite = room.hasPermissionTo("invite");

    function openManageParticipantsModal() {
        openModal(ManageParticipantsModal, { room });
    }

    $: joinedMembers = [...$members]
        .filter((member) => get(member.membership) === "join")
        .sort((memberA, memberB) => get(memberA.name).localeCompare(get(memberB.name)));
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanelParticipants">
    <div class="border border-solid border-x-0 border-t-0 border-white/10 px-4 py-5">
        <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-bold tracking-widest uppercase opacity-75">
                {$LL.chat.roomPanel.sections.participants()}
            </div>

            {#if $canInvite}
                <button
                    type="button"
                    class="m-0 rounded-lg border border-solid border-white/10 bg-white/10 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/15"
                    data-testid="roomSidePanelInviteButton"
                    on:click={openManageParticipantsModal}
                >
                    {$LL.chat.manageRoomUsers.buttons.invite()}
                </button>
            {/if}
        </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-3">
        {#if joinedMembers.length === 0}
            <div
                class="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm opacity-60"
                data-testid="roomSidePanelParticipantsEmpty"
            >
                {$LL.chat.roomPanel.participantsEmpty()}
            </div>
        {:else}
            <div class="flex flex-col gap-2">
                {#each joinedMembers as member (member.id)}
                    <RoomSidePanelParticipantRow {member} />
                {/each}
            </div>
        {/if}
    </div>
</div>
