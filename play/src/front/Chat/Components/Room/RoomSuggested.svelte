<script lang="ts">
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { selectedRoomStore } from "../../Stores/ChatStore";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import Avatar from "../Avatar.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLoader } from "@wa-icons";

    export let roomInformation: { name: string; id: string };
    let roomName = roomInformation.name;
    let loadingInvitation = false;
    const chatconnection = gameManager.getChatConnection();

    function joinRoom() {
        loadingInvitation = true;
        chatconnection
            .joinRoom(roomInformation.id)
            .then((room) => {
                if (!room.isRoomFolder) selectedRoomStore.set(room);
            })
            .catch((error) => {
                warningMessageStore.addWarningMessage($LL.chat.failedToJoinRoom());
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
        <Avatar avatarUrl={roomInformation.avatarUrl} fallbackName={roomName} />
    </div>
    <div class="tw-m-0 tw-grow tw-text-sm tw-font-bold">
        {roomName}
    </div>
    {#if loadingInvitation}
        <div class="tw-min-h-[60px] tw-text-md tw-flex tw-gap-2 tw-justify-center tw-flex-row tw-items-center tw-p-1">
            <IconLoader class="tw-animate-spin" />
        </div>
    {:else}
        <div class="tw-flex tw-gap-1">
            <button
                class="tw-border tw-border-solid tw-border-success tw-text-success hover:tw-bg-success-400/10 tw-rounded tw-text-xs tw-py-1 tw-px-2 tw-m-0"
                data-testid="acceptInvitationButton"
                on:click={() => joinRoom()}
            >
                {$LL.chat.join()}
            </button>
        </div>
    {/if}
</div>
