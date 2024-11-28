<script lang="ts">
    import Select from "svelte-select";
    import { closeModal } from "svelte-modals";
    import { fade } from "svelte/transition";
    import Popup from "../../../Components/Modal/Popup.svelte";
    import { ChatRoom, ChatRoomMembership } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import { searchChatMembersRule } from "./searchChatMembersRule";
    import { IconLoader } from "@wa-icons";

    export let isOpen: boolean;
    export let room: ChatRoom;

    const { searchMembers } = searchChatMembersRule();

    let invitations: { value: string; label: string }[] = [];

    let sendingInvitationsToRoom = false;
    let invitationToRoomError: string | undefined = undefined;

    async function inviteUsersAndCloseModalOnSuccess() {
        try {
            sendingInvitationsToRoom = true;
            await room.inviteUsers(invitations.map((invitation) => invitation.value));
            closeModal();
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

    function getTranslatedMembership(membership: ChatRoomMembership) {
        switch (membership) {
            case "join":
                return $LL.chat.manageRoomUsers.join();
            case "invite":
                return $LL.chat.manageRoomUsers.invite();
            case "ban":
                return $LL.chat.manageRoomUsers.ban();
            case "leave":
                return $LL.chat.manageRoomUsers.leave();
            default:
                return $LL.chat.manageRoomUsers.invite();
        }
    }
</script>

<Popup {isOpen}>
    <h1 slot="title">{$LL.chat.manageRoomUsers.title()}</h1>
    <div slot="content" class="w-full flex flex-col gap-2">
        {#if sendingInvitationsToRoom}
            <div class="animate-[spin_2s_linear_infinite] self-center">
                <IconLoader font-size="2em" />
            </div>
        {:else}
            {#if invitationToRoomError}
                <div transition:fade class="bg-red-500 p-2 rounded text-ellipsis overflow-hidden">
                    {$LL.chat.manageRoomUsers.error()} : <b><i>{invitationToRoomError}</i></b>
                </div>
            {/if}
            <p class="p-0 m-0 pl-1 font-bold">{$LL.chat.manageRoomUsers.invitations()}</p>
            <Select
                bind:value={invitations}
                multiple
                class="!border-light-purple border border-solid !bg-contrast !rounded-md"
                inputStyles="box-shadow:none !important"
                --border-focused="2px solid rgb(146 142 187)"
                --input-color="white"
                --item-color="black"
                --item-hover-color="black"
                --clear-select-color="red"
                loadOptions={searchMembers}
                placeholder={$LL.chat.createRoom.users()}
            >
                <div slot="item" let:item>
                    {`${item.label} (${item.value})`}
                </div>
            </Select>
            <p class="p-0 m-0 pl-1 font-bold">{$LL.chat.manageRoomUsers.participants()}</p>
            <ul class="list-none !p-0">
                {#each room.members as member (member.id)}
                    <li class="flex mb-1 justify-between">
                        <p class="m-0 p-0">{member.name}</p>
                        <p
                            class="m-0 px-2 py-1 bg-green-500 rounded"
                            class:bg-orange-500={member.membership === "invite"}
                            class:bg-red-500={member.membership === "ban" || member.membership === "leave"}
                        >
                            {getTranslatedMembership(member.membership)}
                        </p>
                    </li>
                {/each}
            </ul>
        {/if}
    </div>
    <svelte:fragment slot="action">
        {#if sendingInvitationsToRoom}
            <p>{$LL.chat.createRoom.loadingCreation()}</p>
        {:else}
            <button class="flex-1 justify-center" on:click={closeModal}
                >{$LL.chat.manageRoomUsers.buttons.cancel()}</button
            >
            <button
                data-testid="createRoomButton"
                class="disabled:text-gray-400 disabled:bg-gray-500 bg-secondary flex-1 justify-center"
                disabled={invitations === undefined || invitations.length === 0}
                on:click={inviteUsersAndCloseModalOnSuccess}
                >{$LL.chat.manageRoomUsers.buttons.sendInvitations()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
