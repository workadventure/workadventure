<script lang="ts">
    import { closeModal } from "svelte-modals";
    import { fade } from "svelte/transition";
    import { get } from "svelte/store";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { ChatRoomMembershipManagement, ChatRoomModeration } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import SelectMatrixUser from "../SelectMatrixUser.svelte";
    import RoomParticipant from "./RoomParticipant.svelte";
    import { IconLoader } from "@wa-icons";
    export let isOpen: boolean;
    export let room: ChatRoomMembershipManagement & ChatRoomModeration;
    const members = room.members;

    let invitations: { value: string; label: string }[] = [];
    let sendingInvitationsToRoom = false;
    let invitationToRoomError: string | undefined = undefined;

    const hasPermissionToInvite = room.hasPermissionTo("invite");
    async function inviteUsersAndCloseModalOnSuccess() {
        try {
            sendingInvitationsToRoom = true;
            await room.inviteUsers(invitations.map((invitation) => invitation.value));
            notificationPlayingStore.playNotification($LL.chat.manageRoomUsers.sendInvitationsSuccessNotification());
        } catch (error) {
            console.error(error);
            if (error instanceof Error) {
                invitationToRoomError = error.message;
            }
        } finally {
            sendingInvitationsToRoom = false;
            setTimeout(() => (invitationToRoomError = undefined), 2000);
        }
    }

    function handleSelectMatrixUserError(e: CustomEvent) {
        invitationToRoomError = e.detail.error;
    }
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.manageRoomUsers.title()}</h1>
    <div slot="content" class="tw-w-full tw-flex tw-flex-col tw-gap-2" data-testid="inviteParticipantsModalContent">
        {#if sendingInvitationsToRoom}
            <div class="tw-animate-[spin_2s_linear_infinite] tw-self-center">
                <IconLoader font-size="2em" />
            </div>
        {:else}
            {#if invitationToRoomError}
                <div transition:fade class="tw-bg-red-500 tw-p-2 tw-rounded-md tw-text-ellipsis tw-overflow-hidden">
                    {$LL.chat.manageRoomUsers.error()} : <b><i>{invitationToRoomError}</i></b>
                </div>
            {/if}
            <SelectMatrixUser
                on:error={handleSelectMatrixUserError}
                bind:value={invitations}
                placeholder={$LL.chat.createRoom.users()}
            />
            <div class="tw-max-h-96 tw-overflow-auto">
                <table class="tw-w-full tw-border-separate tw-border-spacing-2">
                    <thead>
                        <tr>
                            <th class="tw-text-center">{$LL.chat.manageRoomUsers.participants()}</th>
                            <th class="tw-text-center">{$LL.chat.manageRoomUsers.membership()}</th>
                            <th class="tw-text-center">{$LL.chat.manageRoomUsers.permissionLevel()}</th>
                            <th class="tw-text-center">{$LL.chat.manageRoomUsers.actions()}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {#each $members
                            .filter((participant) => {
                                return (invitations || []).length > 0 ? invitations.some( (invitation) => get(participant.name).includes(invitation.label) ) : true;
                            })
                            .sort((participantA, participantB) => {
                                return get(participantA.name).localeCompare(get(participantB.name));
                            }) as member (member.id)}
                            <RoomParticipant {member} {room} />
                        {/each}
                    </tbody>
                </table>
            </div>
        {/if}
    </div>
    <svelte:fragment slot="action">
        {#if sendingInvitationsToRoom}
            <p>{$LL.chat.createRoom.loadingCreation()}</p>
        {:else}
            <button class="tw-flex-1 tw-justify-center" on:click={closeModal}
                >{$LL.chat.manageRoomUsers.buttons.cancel()}</button
            >
            <button
                data-testid="createRoomButton"
                class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                disabled={invitations === undefined || invitations.length === 0 || !$hasPermissionToInvite}
                on:click={inviteUsersAndCloseModalOnSuccess}
                >{$LL.chat.manageRoomUsers.buttons.sendInvitations()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
