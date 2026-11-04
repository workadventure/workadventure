<script lang="ts">
    import { defaultColor } from "@workadventure/shared-utils";
    import type { ChatRoomMembershipManagement, ChatRoom } from "../../Connection/ChatConnection";
    import { warningMessageStore } from "../../../Stores/ErrorStore";
    import { selectedRoomStore } from "../../Stores/SelectRoomStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import Avatar from "../Avatar.svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconLoader, IconX } from "@wa-icons";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement;
    }

    let { room }: Props = $props();
    const chat = gameManager.chatConnection;
    let roomType = $derived(room.type);
    let roomName = $derived(room.name);
    let loadingInvitation = $state(false);
    let peerAvatarColorStore = $derived(room.avatarFallbackColor);
    let subtitle = $derived.by(() => {
        if ($roomType === "direct") return $LL.chat.roomInvitation.direct();
        const kind = room.isRoomFolder ? $LL.chat.roomInvitation.folder() : $LL.chat.roomInvitation.room();
        return room.inviterName ? `${kind} · ${$LL.chat.roomInvitation.invitedBy({ name: room.inviterName })}` : kind;
    });

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
    class="wa-chat-item text-md flex gap-2 flex-row items-center px-2 py-2 test-userinvitation"
    data-testid="userInvitation"
>
    <div class="relative shrink-0">
        <Avatar
            compact
            pictureStore={room.pictureStore}
            fallbackName={$roomName}
            color={$roomType === "direct" ? ($peerAvatarColorStore ?? defaultColor) : null}
        />
        {#if $roomType !== "direct" && room.inviterName}
            <!-- Who invited, on the room's avatar. Initial only: the inviter is not a member we track yet. -->
            <div class="absolute -right-1 -bottom-1 rounded-full ring-2 ring-contrast" title={room.inviterName}>
                <Avatar tiny pictureStore={undefined} fallbackName={room.inviterName} />
            </div>
        {/if}
    </div>
    <div class="flex flex-col min-w-0 grow">
        <div class="m-0 text-sm font-bold truncate">{$roomName}</div>
        <div class="text-xs text-white/50 truncate">{subtitle}</div>
    </div>
    {#if loadingInvitation}
        <div class="flex shrink-0 items-center px-3">
            <IconLoader class="animate-spin" />
        </div>
    {:else}
        <!-- Accept next to the name, decline at the edge where a dismiss is expected. -->
        <div class="flex shrink-0 items-center gap-2">
            <Button variant="secondary" size="xs" dataTestId="acceptInvitationButton" onclick={() => joinRoom()}>
                {$roomType === "direct" ? $LL.chat.accept() : $LL.chat.join()}
            </Button>
            <Button
                variant="light"
                appearance="ghost"
                size="xs"
                square
                aria-label={$LL.chat.decline()}
                title={$LL.chat.decline()}
                onclick={() => leaveRoom()}
            >
                {#snippet icon()}
                    <IconX font-size="16" />
                {/snippet}
            </Button>
        </div>
    {/if}
</div>
