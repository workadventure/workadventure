<script lang="ts">
    import { ChatRoomMembershipManagement, ChatRoom } from "../../Connection/ChatConnection";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
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
    class="text-md flex gap-2 flex-row items-center hover:bg-white transition-all hover:bg-opacity-10 hover:rounded hover:!cursor-pointer p-2 test-userinvitation"
    data-testid="userInvitation"
>
    <div class="relative">
        <Avatar avatarUrl={room.avatarUrl} fallbackName={$roomName} />
    </div>
    <div class="m-0 grow text-sm font-bold">
        {$roomName}
    </div>
    {#if loadingInvitation}
        <div class="min-h-[60px] text-md flex gap-2 justify-center flex-row items-center p-1">
            <IconLoader class="animate-spin" />
        </div>
    {:else}
        <div class="flex gap-1">
            <button
                class="border border-solid border-danger text-danger hover:bg-danger-400/10 rounded text-xs py-1 px-2 m-0"
                on:click={() => leaveRoom()}
            >
                {$LL.chat.decline()}
            </button>
            <button
                class="border border-solid border-success text-success hover:bg-success-400/10 rounded text-xs py-1 px-2 m-0"
                data-testid="acceptInvitationButton"
                on:click={() => joinRoom()}
            >
                {$LL.chat.accept()}
            </button>
        </div>
    {/if}
</div>
