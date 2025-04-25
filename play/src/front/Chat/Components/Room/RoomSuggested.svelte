<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import Avatar from "../Avatar.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLoader } from "@wa-icons";

    export let roomInformation: { name: string; id: string; avatarUrl: string };
    let roomName = roomInformation.name;
    let loadingInvitation = false;

    async function joinRoom() {
        loadingInvitation = true;
        try {
            const chatconnection = await gameManager.getChatConnection();
            chatconnection
                .joinRoom(roomInformation.id)
                .then((room) => {
                    if (room && !room.isRoomFolder) selectedRoomStore.set(room);
                })
                .catch(() => {
                    warningMessageStore.addWarningMessage($LL.chat.failedToJoinRoom());
                })
                .finally(() => {
                    loadingInvitation = false;
                });
        } catch (error) {
            loadingInvitation = false;
            console.error(error);
            Sentry.captureException(error);
            warningMessageStore.addWarningMessage($LL.chat.failedToJoinRoom());
        }
    }
</script>

<div
    class="text-md flex gap-2 flex-row items-center hover:bg-white transition-all hover:bg-opacity-10 hover:rounded-md hover:!cursor-pointer p-2"
    data-testid="userInvitation"
>
    <div class="relative">
        <Avatar avatarUrl={roomInformation.avatarUrl} fallbackName={roomName} />
    </div>
    <div class="m-0 grow text-sm font-bold">
        {roomName}
    </div>
    {#if loadingInvitation}
        <div class="min-h-[60px] text-md flex gap-2 justify-center flex-row items-center p-1">
            <IconLoader class="animate-spin" />
        </div>
    {:else}
        <div class="flex gap-1">
            <button
                class="border border-solid border-success text-success hover:bg-success-400/10 rounded text-xs py-1 px-2 m-0"
                data-testid="acceptInvitationButton"
                on:click={() => joinRoom()}
            >
                {$LL.chat.join()}
            </button>
        </div>
    {/if}
</div>
