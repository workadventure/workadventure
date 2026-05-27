<script lang="ts">
    import { onMount } from "svelte";
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
        ChatRoomSidePanelHydrationState,
        ChatThreadSummary,
    } from "../../Connection/ChatConnection";
    import { draftMessageService } from "../../Services/DraftMessageService";
    import { roomSidePanelStore, type RoomSidePanelSection } from "../../Stores/RoomSidePanelStore";
    import ManageParticipantsModal from "./ManageParticipantsModal.svelte";
    import {
        IconBellOff,
        IconCheckList,
        IconLoader,
        IconLogout,
        IconMessageCircle2,
        IconSettings,
        IconUnMute,
        IconUserPlus,
        IconUsersGroup,
    } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement & ChatRoomModeration & ChatRoomNotificationControl;
    }

    let { room }: Props = $props();

    const emptyThreads = readable<readonly ChatThreadSummary[]>([]);
    const emptyPolls = readable<readonly ChatPollItem[]>([]);
    const idleHydrationState = readable<ChatRoomSidePanelHydrationState>({ status: "idle" });

    onMount(() => {
        room.ensureThreadsHydrated?.().catch((error) => console.error("Failed to hydrate room threads", error));
        room.ensurePollCatalogueHydrated?.().catch((error) =>
            console.error("Failed to hydrate room polls catalogue", error),
        );
    });

    let members = $derived(room.members);
    let roomName = $derived(room.name);
    let roomType = $derived(room.type);
    let isEncrypted = $derived(room.isEncrypted);
    let canInvite = $derived(room.hasPermissionTo("invite"));
    let areNotificationsMuted = $derived(room.areNotificationsMuted);
    let threads = $derived(room.threads ?? emptyThreads);
    let pollItems = $derived(room.pollItems ?? emptyPolls);
    let threadsHydrationState = $derived(room.threadsHydrationState ?? idleHydrationState);
    let pollCatalogueHydrationState = $derived(room.pollCatalogueHydrationState ?? idleHydrationState);
    let joinedMembers = $derived($members.filter((member) => get(member.membership) === "join"));
    let joinedMemberCountStore = $derived(room.joinedMemberCount);
    let participantBadgeCount = $derived(
        joinedMemberCountStore != null ? $joinedMemberCountStore : joinedMembers.length,
    );
    let unreadThreadCount = $derived($threads.filter((thread) => thread.hasUnreadMessages).length);
    let openPollCount = $derived($pollItems.filter((poll) => !get(poll.state).isEnded).length);
    let avatarColorStore = $derived(room.avatarFallbackColor);
    let leaveRoomNotification = $derived($LL.chat.roomMenu.leaveRoom.notification());
    let threadWarnings = $derived($threadsHydrationState.warnings ?? []);
    let hasUnsupportedThreadHistory = $derived(
        threadWarnings.some((warning) => warning.reason === "server_unsupported"),
    );
    let threadCardValue = $derived(
        room.threadsHydrationState == null
            ? `${$threads.length}`
            : $threadsHydrationState.status === "loading" || $threadsHydrationState.status === "idle"
              ? $LL.chat.loading()
              : $threadsHydrationState.status === "error"
                ? $LL.chat.roomPanel.status.retry()
                : hasUnsupportedThreadHistory
                  ? "?"
                  : `${$threads.length}`,
    );
    let threadCardHint = $derived(
        room.threadsHydrationState == null
            ? undefined
            : $threadsHydrationState.status === "error"
              ? $LL.chat.roomPanel.threadsLoadError()
              : hasUnsupportedThreadHistory
                ? $LL.chat.roomPanel.status.partialHistory()
                : undefined,
    );
    let pollCardValue = $derived(
        room.pollCatalogueHydrationState == null
            ? `${$pollItems.length} · ${openPollCount} ${$LL.chat.poll.kind.open()}`
            : $pollCatalogueHydrationState.status === "loading" || $pollCatalogueHydrationState.status === "idle"
              ? $LL.chat.loading()
              : $pollCatalogueHydrationState.status === "error"
                ? $LL.chat.roomPanel.status.retry()
                : `${$pollItems.length} · ${openPollCount} ${$LL.chat.poll.kind.open()}`,
    );
    let pollCardHint = $derived(
        room.pollCatalogueHydrationState != null && $pollCatalogueHydrationState.status === "error"
            ? $LL.chat.roomPanel.pollsLoadError()
            : undefined,
    );

    function openSection(section: RoomSidePanelSection) {
        roomSidePanelStore.setActiveSection(section);
    }

    function openManageParticipantsModal() {
        modals.open(ManageParticipantsModal, { room });
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
                    color={$roomType === "direct" ? ($avatarColorStore ?? defaultColor) : null}
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
                onclick={() => openSection("participants")}
            >
                <IconUsersGroup font-size={18} />
                <div class="mt-2 text-sm font-semibold">{$LL.chat.roomPanel.sections.participants()}</div>
                <div class="mt-1 text-xs text-white/55">{participantBadgeCount}</div>
            </button>

            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomeThreads"
                onclick={() => openSection("threads")}
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
                <div class="mt-1 flex min-h-4 items-center text-xs text-white/55">
                    {#if room.threadsHydrationState != null && ($threadsHydrationState.status === "loading" || $threadsHydrationState.status === "idle")}
                        <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                    {:else}
                        {threadCardValue}
                    {/if}
                </div>
                {#if threadCardHint}
                    <div class="mt-1 text-xs text-white/45">{threadCardHint}</div>
                {/if}
            </button>

            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomePolls"
                onclick={() => openSection("polls")}
            >
                <IconCheckList font-size={18} />
                <div class="mt-2 text-sm font-semibold">{$LL.chat.roomPanel.sections.polls()}</div>
                <div class="mt-1 flex min-h-4 items-center text-xs text-white/55">
                    {#if room.pollCatalogueHydrationState != null && ($pollCatalogueHydrationState.status === "loading" || $pollCatalogueHydrationState.status === "idle")}
                        <IconLoader class="animate-[spin_2s_linear_infinite]" font-size={14} />
                    {:else}
                        {pollCardValue}
                    {/if}
                </div>
                {#if pollCardHint}
                    <div class="mt-1 text-xs text-white/45">{pollCardHint}</div>
                {/if}
            </button>

            <button
                type="button"
                class="m-0 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-3 text-left text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomeSettings"
                onclick={() => openSection("settings")}
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
                    onclick={openManageParticipantsModal}
                >
                    <IconUserPlus font-size={17} />
                    {$LL.chat.manageRoomUsers.buttons.invite()}
                </button>
            {/if}

            <button
                type="button"
                class="m-0 flex items-center gap-2 rounded-lg border border-solid border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/[0.08]"
                data-testid="roomSidePanelHomeMute"
                onclick={toggleMute}
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
                onclick={leaveRoom}
            >
                <IconLogout font-size={17} />
                {$LL.chat.roomMenu.leaveRoom.label()}
            </button>
        </div>
    </div>
</div>
