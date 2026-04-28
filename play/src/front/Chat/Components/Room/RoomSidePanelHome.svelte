<script lang="ts">
    import { openModal } from "svelte-modals";
    import { get, readable } from "svelte/store";
    import { defaultColor } from "@workadventure/shared-utils";
    import LL from "../../../../i18n/i18n-svelte";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
    import Avatar from "../Avatar.svelte";
    import EncryptionBadge from "../EncryptionBadge.svelte";
    import type {
        ChatPollItem,
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomNotificationControl,
        ChatThreadSummary,
    } from "../../Connection/ChatConnection";
    import { draftMessageService } from "../../Services/DraftMessageService";
    import { roomSidePanelStore, type RoomSidePanelSection } from "../../Stores/RoomSidePanelStore";
    import ManageParticipantsModal from "./ManageParticipantsModal.svelte";
    import {
        IconBellOff,
        IconCheckList,
        IconLogout,
        IconMessageCircle2,
        IconSettings,
        IconUnMute,
        IconUserPlus,
        IconUsersGroup,
    } from "@wa-icons";

    export let room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration & ChatRoomNotificationControl;

    const emptyThreads = readable<readonly ChatThreadSummary[]>([]);
    const emptyPolls = readable<readonly ChatPollItem[]>([]);

    $: members = room.members;
    $: roomName = room.name;
    $: roomType = room.type;
    $: isEncrypted = room.isEncrypted;
    $: canInvite = room.hasPermissionTo("invite");
    $: areNotificationsMuted = room.areNotificationsMuted;
    $: threads = room.threads ?? emptyThreads;
    $: pollItems = room.pollItems ?? emptyPolls;
    $: joinedMembers = $members.filter((member) => get(member.membership) === "join");
    $: unreadThreadCount = $threads.filter((thread) => thread.hasUnreadMessages).length;
    $: openPollCount = $pollItems.filter((poll) => !get(poll.state).isEnded).length;
    $: avatarColorStore = room.avatarFallbackColor;
    $: leaveRoomNotification = $LL.chat.roomMenu.leaveRoom.notification();

    function openSection(section: RoomSidePanelSection) {
        roomSidePanelStore.setActiveSection(section);
    }

    function openManageParticipantsModal() {
        openModal(ManageParticipantsModal, { room });
    }

    function toggleMute() {
        if ($areNotificationsMuted) {
            room.unmuteNotification().catch(() => console.error("Failed to unmute room"));
            return;
        }
        room.muteNotification().catch(() => console.error("Failed to mute room"));
    }

    function leaveRoom() {
        const roomId = room.id;
        room.leaveRoom()
            .then(() => {
                draftMessageService.deleteDraft(`${roomId}-${localUserStore.getChatId() ?? "0"}`);
                notificationPlayingStore.playNotification(leaveRoomNotification);
            })
            .catch(() => console.error("Failed to leave room"));
    }
</script>

<div class="flex h-full min-h-0 flex-col bg-white/[0.02]" data-testid="roomSidePanelHome">
    <div class="border border-solid border-x-0 border-t-0 border-white/10 px-4 py-5">
        <div class="flex items-center gap-3">
            <div class="relative shrink-0">
                <Avatar
                    compact
                    pictureStore={room.pictureStore}
                    fallbackName={$roomName}
                    color={$roomType === "direct" ? $avatarColorStore ?? defaultColor : null}
                />
                {#if $isEncrypted}
                    <EncryptionBadge />
                {/if}
            </div>

            <div class="min-w-0 flex-1">
                <div class="truncate text-lg font-bold text-white">{$roomName}</div>
                <div class="mt-1 flex flex-wrap gap-1.5 text-xs text-white/65">
                    <span class="rounded-full bg-white/10 px-2 py-0.5">
                        {$roomType === "direct"
                            ? $LL.chat.roomPanel.home.directRoom()
                            : $LL.chat.roomPanel.home.groupRoom()}
                    </span>
                    <span class="rounded-full bg-white/10 px-2 py-0.5">
                        {$isEncrypted ? $LL.chat.roomPanel.home.encrypted() : $LL.chat.roomPanel.home.notEncrypted()}
                    </span>
                </div>
            </div>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto px-3 py-3">
        <div class="grid grid-cols-2 gap-2">
            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomeParticipants"
                on:click={() => openSection("participants")}
            >
                <IconUsersGroup font-size={18} />
                <div class="mt-2 text-sm font-semibold">{$LL.chat.roomPanel.sections.participants()}</div>
                <div class="mt-1 text-xs text-white/55">{joinedMembers.length}</div>
            </button>

            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomeThreads"
                on:click={() => openSection("threads")}
            >
                <div class="flex items-center justify-between gap-2">
                    <IconMessageCircle2 font-size={18} />
                    {#if unreadThreadCount > 0}
                        <span class="rounded-full bg-success px-1.5 py-0.5 text-xs font-bold text-contrast">
                            {unreadThreadCount > 9 ? "9+" : unreadThreadCount}
                        </span>
                    {/if}
                </div>
                <div class="mt-2 text-sm font-semibold">{$LL.chat.roomPanel.sections.threads()}</div>
                <div class="mt-1 text-xs text-white/55">{$threads.length}</div>
            </button>

            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomePolls"
                on:click={() => openSection("polls")}
            >
                <IconCheckList font-size={18} />
                <div class="mt-2 text-sm font-semibold">{$LL.chat.roomPanel.sections.polls()}</div>
                <div class="mt-1 text-xs text-white/55">
                    {$pollItems.length} · {openPollCount}
                    {$LL.chat.poll.kind.open()}
                </div>
            </button>

            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomeSettings"
                on:click={() => openSection("settings")}
            >
                <IconSettings font-size={18} />
                <div class="mt-2 text-sm font-semibold">{$LL.chat.roomPanel.sections.settings()}</div>
                <div class="mt-1 text-xs text-white/55">{$LL.chat.roomPanel.home.readOnly()}</div>
            </button>
        </div>

        <div class="mt-3 flex flex-col gap-2">
            {#if $canInvite}
                <button
                    type="button"
                    class="m-0 flex items-center gap-2 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
                    data-testid="roomSidePanelHomeInvite"
                    on:click={openManageParticipantsModal}
                >
                    <IconUserPlus font-size={17} />
                    {$LL.chat.manageRoomUsers.buttons.invite()}
                </button>
            {/if}

            <button
                type="button"
                class="m-0 flex items-center gap-2 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomeMute"
                on:click={toggleMute}
            >
                {#if $areNotificationsMuted}
                    <IconUnMute font-size={17} />
                    {$LL.chat.roomMenu.unmuteRoom()}
                {:else}
                    <IconBellOff font-size={17} />
                    {$LL.chat.roomMenu.muteRoom()}
                {/if}
            </button>

            <button
                type="button"
                class="m-0 flex items-center gap-2 rounded-lg border border-solid border-danger-900/50 bg-danger-900/30 px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-danger-900/50"
                data-testid="roomSidePanelHomeLeave"
                on:click={leaveRoom}
            >
                <IconLogout font-size={17} />
                {$LL.chat.roomMenu.leaveRoom.label()}
            </button>
        </div>
    </div>
</div>
