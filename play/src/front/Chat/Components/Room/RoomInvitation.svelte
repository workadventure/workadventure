<script lang="ts">
    import { ChatRoom } from "../../Connection/ChatConnection";
    import { selectedRoom } from "../../Stores/ChatStore";
    import Avatar from "../Avatar.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLoader } from "@wa-icons";
    export let room: ChatRoom;
    let roomName = room.name;
    let loadingInvitation = false;

    function joinRoom() {
        loadingInvitation = true;
        room.joinRoom()
            .then(() => {
                selectedRoom.set(room);
            })
            .finally(() => {
                loadingInvitation = false;
            });
    }

    function leaveRoom() {
        loadingInvitation = true;
        room.leaveRoom().finally(() => {
            loadingInvitation = false;
        });
    }
</script>

<div
    class="tw-text-md tw-flex tw-gap-2 tw-flex-row tw-items-center hover:tw-bg-white hover:tw-bg-opacity-10 hover:tw-rounded-md hover:!tw-cursor-pointer tw-p-1"
    data-testid="userInvitation"
>
    <div class="tw-relative">
        <Avatar avatarUrl={room.avatarUrl} fallbackName={$roomName} />
    </div>
    <p class="tw-m-0">{$roomName}</p>
</div>
{#if loadingInvitation}
    <div class="tw-min-h-[60px] tw-text-md tw-flex tw-gap-2 tw-justify-center tw-flex-row tw-items-center tw-p-1">
        <IconLoader class="tw-animate-spin" />
    </div>
{:else}
    <div class="tw-flex">
        <button class="tw-text-blue-300" data-testid="acceptInvitationButton" on:click={() => joinRoom()}>
            {$LL.chat.accept()}
        </button>
        <button class="tw-text-red-500" on:click={() => leaveRoom()}>{$LL.chat.decline()}</button>
    </div>
{/if}
