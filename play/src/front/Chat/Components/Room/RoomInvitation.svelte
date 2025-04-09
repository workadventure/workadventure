<script lang="ts">
    import { ChatRoomMembershipManagement, ChatRoom } from "../../Connection/ChatConnection";
    import { selectedRoomStore } from "../../Stores/ChatStore";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import Avatar from "../Avatar.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLoader } from "@wa-icons";

    export let room: ChatRoom & ChatRoomMembershipManagement;
    let roomName = room.name;
    let loadingInvitation = false;

    function joinRoom() {
        loadingInvitation = true;

        room.joinRoom()
            .then(() => {
                if (!room.isRoomFolder) selectedRoomStore.set(room);
            })
            .catch(() => {
                warningMessageStore.addWarningMessage($LL.chat.failedToJoinRoom());
            })
            .finally(() => {
                loadingInvitation = false;
            });
    }

    function leaveRoom() {
        loadingInvitation = true;
        room.leaveRoom()
            .catch(() => {
                warningMessageStore.addWarningMessage($LL.chat.failedToLeaveRoom());
            })
            .finally(() => {
                loadingInvitation = false;
            });
    }
</script>

<div
    class="tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white tw-transition-all hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-2"
    data-testid="userInvitation"
>
    <div class="tw-relative">
        <Avatar avatarUrl={room.avatarUrl} fallbackName={$roomName} />
    </div>
    <div class="tw-m-0 tw-grow tw-text-sm tw-font-bold">
        {$roomName}
    </div>
    {#if loadingInvitation}
        <div class="tw-min-h-[60px] tw-text-md tw-flex tw-gap-2 tw-justify-center tw-flex-row tw-items-center tw-p-1">
            <IconLoader class="tw-animate-spin" />
        </div>
    {:else}
        <div class="tw-flex tw-gap-1">
            <button
                class="tw-border tw-border-solid tw-border-danger tw-text-danger hover:tw-bg-danger-400/10 tw-rounded tw-text-xs tw-py-1 tw-px-2 tw-m-0"
                on:click={() => leaveRoom()}
            >
                {$LL.chat.decline()}
            </button>
            <button
                class="tw-border tw-border-solid tw-border-success tw-text-success hover:tw-bg-success-400/10 tw-rounded tw-text-xs tw-py-1 tw-px-2 tw-m-0"
                data-testid="acceptInvitationButton"
                on:click={() => joinRoom()}
            >
                {$LL.chat.accept()}
            </button>
        </div>
    {/if}
</div>
