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

    const { searchWorldMembers } = searchChatMembersRule();

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
    <div slot="content" class="tw-w-full tw-flex tw-flex-col tw-gap-2">
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
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.manageRoomUsers.invitations()}</p>
            <Select
                bind:value={invitations}
                multiple
                class="!tw-border-light-purple tw-border tw-border-solid !tw-bg-contrast !tw-rounded-xl"
                inputStyles="box-shadow:none !important"
                --border-focused="2px solid rgb(146 142 187)"
                --input-color="white"
                --item-color="black"
                --item-hover-color="black"
                --clear-select-color="red"
                loadOptions={searchWorldMembers}
                placeholder={$LL.chat.createRoom.users()}
            >
                <div slot="item" let:item>
                    {`${item.label} (${item.value})`}
                </div>
            </Select>
            <p class="tw-p-0 tw-m-0 tw-pl-1 tw-font-bold">{$LL.chat.manageRoomUsers.participants()}</p>
            <ul class="tw-list-none !tw-p-0">
                {#each room.members as member (member.id)}
                    <li class="tw-flex tw-mb-1 tw-justify-between">
                        <p class="tw-m-0 tw-p-0">{member.name}</p>
                        <p
                            class="tw-m-0 tw-px-2 tw-py-1 tw-bg-green-500 tw-rounded-md"
                            class:tw-bg-orange-500={member.membership === "invite"}
                            class:tw-bg-red-500={member.membership === "ban" || member.membership === "leave"}
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
            <button class="tw-flex-1 tw-justify-center" on:click={closeModal}
                >{$LL.chat.manageRoomUsers.buttons.cancel()}</button
            >
            <button
                data-testid="createRoomButton"
                class="disabled:tw-text-gray-400 disabled:tw-bg-gray-500 tw-bg-secondary tw-flex-1 tw-justify-center"
                disabled={invitations === undefined || invitations.length === 0}
                on:click={inviteUsersAndCloseModalOnSuccess}
                >{$LL.chat.manageRoomUsers.buttons.sendInvitations()}
            </button>
        {/if}
    </svelte:fragment>
</Popup>
