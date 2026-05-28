<script lang="ts">
    import LL from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import type {
        ProximityChatSidePanelParticipant,
        ProximityChatSidePanelRoom,
    } from "../../Connection/ChatConnection";
    import { openProximityParticipantWokaMenu } from "../../Connection/Proximity/ProximityParticipantWokaMenu";
    import Avatar from "../Avatar.svelte";

    export let room: ProximityChatSidePanelRoom;

    function getParticipantName(participant: ProximityChatSidePanelParticipant): string {
        return participant.name ?? "?";
    }

    $: participantsStore = room.currentMeetingParticipantsStore;
    $: participants = [...$participantsStore].sort((participantA, participantB) =>
        getParticipantName(participantA).localeCompare(getParticipantName(participantB))
    );

    function openParticipantWokaMenu(participant: ProximityChatSidePanelParticipant): void {
        if (!participant.uuid) {
            return;
        }

        openProximityParticipantWokaMenu(participant, gameManager.getCurrentGameScene());
    }
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="proximityRoomSidePanelParticipants">
    <div class="border border-solid border-x-0 border-t-0 border-white/10 px-4 py-5">
        <div class="flex items-center justify-between gap-3">
            <div class="text-sm font-bold tracking-widest uppercase opacity-75">
                {$LL.chat.roomPanel.sections.participants()}
            </div>
            <div class="rounded-full bg-white/10 px-2 py-0.5 text-xs text-white/65">
                {participants.length}
            </div>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-3">
        {#if participants.length === 0}
            <div
                class="rounded-lg border border-dashed border-white/10 px-4 py-6 text-center text-sm opacity-60"
                data-testid="proximityRoomSidePanelParticipantsEmpty"
            >
                {$LL.chat.roomPanel.participantsEmpty()}
            </div>
        {:else}
            <div class="flex flex-col gap-2">
                {#each participants as participant (participant.spaceUserId)}
                    <button
                        type="button"
                        class="flex w-full items-center gap-3 rounded-lg border border-solid border-white/10 bg-white/[0.03] px-3 py-2 text-left transition hover:border-white/20 hover:bg-white/[0.06] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 disabled:cursor-not-allowed disabled:hover:border-white/10 disabled:hover:bg-white/[0.03]"
                        data-testid="proximityRoomSidePanelParticipantRow"
                        disabled={!participant.uuid}
                        on:click={() => openParticipantWokaMenu(participant)}
                    >
                        <Avatar
                            compact
                            pictureStore={participant.pictureStore}
                            fallbackName={getParticipantName(participant)}
                        />

                        <div class="min-w-0 flex-1">
                            <div class="truncate text-sm font-semibold text-white">
                                {getParticipantName(participant)}
                            </div>
                            {#if participant.roomName}
                                <div class="truncate text-xs opacity-70">
                                    {participant.roomName}
                                </div>
                            {/if}
                        </div>
                    </button>
                {/each}
            </div>
        {/if}
    </div>
</div>
