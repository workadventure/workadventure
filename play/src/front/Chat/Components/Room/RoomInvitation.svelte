<script lang="ts">
    import { defaultColor } from "@workadventure/shared-utils";
    import type { ChatRoomMembershipManagement, ChatRoom } from "../../Connection/ChatConnection";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import Avatar from "../Avatar.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLoader } from "@wa-icons";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement;
    }

    let { room }: Props = $props();
    const chat = gameManager.chatConnection;
    let roomType = $derived(room.type);
    let roomName = $derived(room.name);
    let loadingInvitation = $state(false);
    let peerAvatarColorStore = $derived(room.avatarFallbackColor);

    function joinRoom() {
        loadingInvitation = true;

        // Accepting the invitation flips the room to "join", which destroys THIS component's `room` wrapper —
        // a fresh one is rebuilt during placement reconciliation. Selecting `room` here would bind the open
        // timeline to that destroyed wrapper (its live RoomEvent.Timeline listener is gone), so messages sent
        // right after joining are delivered to the server but never render until the room is re-opened. Route
        // through the connection's joinRoom, which resolves with the live wrapper now in the room list, and
        // select that instead (same pattern as JoignableRooms/RoomSuggested).
        chat.joinRoom(room.id)
            .then((joinedRoom) => {
                if (joinedRoom && !joinedRoom.isRoomFolder) selectedRoomStore.set(joinedRoom);
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
    class="wa-chat-item text-md flex gap-2 flex-row items-center transition-all hover:bg-white/10 hover:rounded hover:!cursor-pointer px-2 py-2 test-userinvitation"
    data-testid="userInvitation"
>
    <div class="relative shrink-0">
        <Avatar
            compact
            pictureStore={room.pictureStore}
            fallbackName={$roomName}
            color={$roomType === "direct" ? ($peerAvatarColorStore ?? defaultColor) : null}
        />
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
                onclick={() => leaveRoom()}
            >
                {$LL.chat.decline()}
            </button>
            <button
                class="border border-solid border-success text-success hover:bg-success-400/10 rounded text-xs py-1 px-2 m-0"
                data-testid="acceptInvitationButton"
                onclick={() => joinRoom()}
            >
                {$LL.chat.accept()}
            </button>
        </div>
    {/if}
</div>
