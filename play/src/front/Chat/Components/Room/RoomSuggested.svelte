<script lang="ts">
    import * as Sentry from "@sentry/svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import Avatar from "../Avatar.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { PictureStore } from "../../../Stores/PictureStore";
    import { ignoredSuggestedRoomsService } from "../../Services/IgnoredSuggestedRoomsService";
    import { IconLoader } from "@wa-icons";

    export let roomInformation: { name: string; id: string; pictureStore?: PictureStore };
    export let folderId: string | undefined = undefined;
    export let chatId: string | undefined = undefined;
    let roomName = roomInformation.name;
    let loadingInvitation = false;
    let declining = false;

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

    async function declineRoom() {
        if (folderId === undefined || chatId === undefined) return;
        declining = true;
        try {
            await ignoredSuggestedRoomsService.addIgnoredRoom(chatId, folderId, roomInformation.id);
        } finally {
            declining = false;
        }
    }
</script>

<div
    class="text-md flex gap-2 flex-row items-center hover:bg-white transition-all hover:bg-opacity-10 hover:rounded-md hover:!cursor-pointer p-2"
    data-testid="userInvitation"
>
    <div class="relative">
        <Avatar pictureStore={roomInformation.pictureStore} fallbackName={roomName} />
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
            {#if folderId !== undefined && chatId !== undefined}
                <button
                    type="button"
                    class="border border-solid border-danger text-danger hover:bg-danger-400/10 rounded text-xs py-1 px-2 m-0 disabled:opacity-50"
                    data-testid="declineSuggestedRoomButton"
                    disabled={declining}
                    on:click={(e) => {
                        declineRoom().catch((error) => {
                            warningMessageStore.addWarningMessage($LL.chat.failedToDeclineRoom());
                            Sentry.captureException(error);
                        });
                    }}
                >
                    {$LL.chat.decline()}
                </button>
            {/if}
            <button
                type="button"
                class="border border-solid border-success text-success hover:bg-success-400/10 rounded text-xs py-1 px-2 m-0"
                data-testid="acceptInvitationButton"
                on:click={() => joinRoom()}
            >
                {$LL.chat.join()}
            </button>
        </div>
    {/if}
</div>
