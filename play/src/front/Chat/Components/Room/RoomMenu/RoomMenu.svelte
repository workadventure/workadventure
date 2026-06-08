<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import type { Readable } from "svelte/store";
    import { AskPositionMessage_AskType } from "@workadventure/messages";
    import { hasMatrixChatCapabilities } from "../../../Connection/ChatConnection";
    import type {
        ChatRoom,
        ChatRoomMembershipManagement,
        ChatRoomModeration,
        ChatRoomNotificationControl,
        ChatUser,
        MatrixChatConnectionLike,
    } from "../../../Connection/ChatConnection";
    import { isMatrixChatEnabledStore } from "../../../../Stores/ChatStore";
    import { notificationPlayingStore } from "../../../../Stores/NotificationStore";
    import { localUserStore } from "../../../../Connection/LocalUserStore";
    import { draftMessageService } from "../../../Services/DraftMessageService";
    import LL from "../../../../../i18n/i18n-svelte";
    import ManageParticipantsModal from "../ManageParticipantsModal.svelte";
    import { gameManager } from "../../../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../../../Administration/AnalyticsClient";
    import { scriptUtils } from "../../../../Api/ScriptUtils";
    import type { UserProviderMerger } from "../../../UserProviderMerger/UserProviderMerger";
    import { DEBUG_MODE } from "../../../../Enum/EnvironmentVariable";
    import MatrixPeerProfileDebugModal from "../../MatrixPeerProfileDebugModal.svelte";
    import RoomOption from "./RoomOption.svelte";
    import {
        IconDots,
        IconLogout,
        IconUserEdit,
        IconMute,
        IconUnMute,
        IconMapPin,
        IconCamera,
        IconUserPlus,
        IconSettings,
    } from "@wa-icons";
    import { modals } from "@wa-modals";

    interface Props {
        room: ChatRoom & ChatRoomMembershipManagement & ChatRoomNotificationControl & ChatRoomModeration;
    }

    let { room }: Props = $props();
    let roomType = $derived(room.type);
    let areNotificationsMuted = $derived(room.areNotificationsMuted);
    let roomMembers = $derived(room.members);
    let optionButtonRef: HTMLButtonElement | undefined = $state(undefined);
    let hideOptions = $state(true);
    let usersByRoomStore:
        | Readable<Map<string | undefined, { roomName: string | undefined; users: ChatUser[] }>>
        | undefined = $state(undefined);

    const { connection } = gameManager.getCurrentGameScene();

    function matrixConnectionFromGameManager(): MatrixChatConnectionLike | undefined {
        try {
            const c = gameManager.chatConnection;
            return hasMatrixChatCapabilities(c) ? c : undefined;
        } catch {
            return undefined;
        }
    }

    /** Everyone can open the participant list; only admins can invite / change roles / kick / ban (enforced in the modal). */
    const shouldDisplayManageParticipantButton = true;

    onMount(() => {
        document.addEventListener("click", closeRoomOptionsOnClickOutside);
        // Initialize usersByRoomStore
        gameManager
            .getCurrentGameScene()
            .userProviderMerger.then((merger: UserProviderMerger) => {
                usersByRoomStore = merger.usersByRoomStore;
            })
            .catch((error) => {
                console.error("Failed to get users by room store : ", error);
            });
    });

    onDestroy(() => {
        document.removeEventListener("click", closeRoomOptionsOnClickOutside);
    });

    function toggleRoomOptions() {
        if (optionButtonRef === undefined) {
            return;
        }
        if (hideOptions) {
            room.ensureMembersInitialized().catch((error) => console.error(error));
        }
        hideOptions = !hideOptions;
    }

    function closeRoomOptionsOnClickOutside(e: MouseEvent) {
        if (optionButtonRef === undefined) {
            return;
        }
        if (e.target instanceof HTMLElement && !optionButtonRef.contains(e.target)) {
            hideOptions = true;
        }
    }

    function closeMenuAndLeaveRoom() {
        toggleRoomOptions();
        const roomId = room.id;
        room.leaveRoom()
            .then(() => {
                draftMessageService.deleteDraft(`${roomId}-${localUserStore.getChatId() ?? "0"}`);
                notificationPlayingStore.playNotification($LL.chat.roomMenu.leaveRoom.notification());
            })
            .catch(() => console.error("Failed to leave room"));
    }

    function openManageParticipantsModal() {
        modals.open(ManageParticipantsModal, { room });
    }

    function closeMenuAndSetMuteStatus() {
        toggleRoomOptions();
        if ($areNotificationsMuted) {
            room.unmuteNotification().catch(() => {
                console.error("Failed to unmute room");
            });
            return;
        }
        room.muteNotification().catch(() => {
            console.error("Failed to mute room");
        });
    }

    let usersByRoomMap = $derived(usersByRoomStore && $usersByRoomStore ? $usersByRoomStore : new Map());

    // Flatten usersByRoomMap into a list of users with playUri from their room
    let usersWithRoomPlayUri = $derived(
        (() => {
            const usersList: (ChatUser & { playUri: string })[] = [];
            for (const [playUri, roomData] of usersByRoomMap.entries()) {
                for (const user of roomData.users) {
                    usersList.push({
                        ...user,
                        playUri: playUri ?? user.playUri ?? "",
                    });
                }
            }
            return usersList;
        })(),
    );

    let matrixChatUser = $derived(
        $roomType === "direct" ? $roomMembers.find((u) => u.id !== localUserStore.getChatId()) : undefined,
    );

    let chatUser = $derived(usersWithRoomPlayUri.find((u) => u.chatId === matrixChatUser?.id));
    let isInTheSameMap = $derived(chatUser?.playUri === gameManager.getCurrentGameScene().roomUrl);

    function locateUser() {
        if (chatUser == undefined || chatUser.uuid == undefined) return;
        // Track the open woka menu action
        analyticsClient.openWokaMenu();

        const currentScerne = gameManager.getCurrentGameScene();

        // Il user is in view port and represented by remote player, use it to activate the woka menu
        const remotePlayerData = currentScerne.getRemotePlayersRepository().getPlayerByUuid(chatUser.uuid);
        if (remotePlayerData != undefined) {
            // Get the actual RemotePlayer sprite from MapPlayersByKey using userId
            const remotePlayer = currentScerne.MapPlayersByKey.get(remotePlayerData.userId);
            if (remotePlayer != undefined) {
                remotePlayer.activate();
                toggleRoomOptions();
                return;
            }
        }

        // If the user isn't in the view port, emit the ask position message to the server
        connection?.emitAskPosition(chatUser.uuid ?? "", chatUser.playUri ?? "", AskPositionMessage_AskType.LOCATE);
        toggleRoomOptions();
    }

    function talkToUser() {
        if (chatUser == undefined) return;
        // Track the talk to user action
        analyticsClient.goToUser();

        if (isInTheSameMap) {
            connection?.emitAskPosition(chatUser.uuid ?? "", chatUser.playUri ?? "", AskPositionMessage_AskType.MOVE);
        } else {
            scriptUtils.goToPage(`${chatUser.playUri}#moveToUser=${chatUser.uuid}`);
        }
        toggleRoomOptions();
    }

    function inviteUserToMeeting() {
        if (chatUser == undefined || chatUser.uuid == undefined) return;
        connection?.emitMeetingInvitationRequest(chatUser.uuid);
    }

    /** Reactive on `$isMatrixChatEnabledStore` so the connection appears when Matrix chat connects. */
    let matrixChatConnection = $derived($isMatrixChatEnabledStore ? matrixConnectionFromGameManager() : undefined);

    let showMatrixPeerProfileDebug = $derived(
        DEBUG_MODE && matrixChatConnection !== undefined && $roomType === "direct" && Boolean(matrixChatUser?.id),
    );

    function openMatrixPeerProfileDebug() {
        if (!matrixChatConnection || matrixChatUser?.id === undefined) {
            return;
        }
        modals.open(MatrixPeerProfileDebugModal, {
            connection: matrixChatConnection,
            matrixUserId: matrixChatUser.id,
            label: chatUser?.username,
        });
        toggleRoomOptions();
    }
</script>

<button
    data-testid="toggleRoomMenu"
    bind:this={optionButtonRef}
    onclick={(event) => {
        event.preventDefault();
        event.stopPropagation();
        toggleRoomOptions();
    }}
    class="m-0 p-0 flex items-center justify-center h-7 w-7 hover:bg-white/10 rounded"
>
    <IconDots font-size="16" />
</button>
<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
    onmouseleave={toggleRoomOptions}
    class="bg-contrast/50 backdrop-blur-md rounded-md overflow-hidden z-[99] w-max end-2 top-10 p-1"
    class:absolute={optionButtonRef !== undefined}
    class:hidden={hideOptions}
>
    {#if $roomType === "direct"}
        <!-- Create Room Option to talk to the user -->
        <RoomOption
            IconComponent={IconCamera}
            title={$LL.chat.userList.TalkTo()}
            onclick={talkToUser}
            disabled={chatUser == undefined || chatUser.uuid == undefined}
        />
        <!-- Create Room Option to locate to the user -->
        <RoomOption
            IconComponent={IconMapPin}
            title={$LL.chat.userList.follow()}
            onclick={locateUser}
            disabled={chatUser == undefined || isInTheSameMap == false}
        />
        <!-- Create Room Option to invite the user to the meeting -->
        <RoomOption
            IconComponent={IconUserPlus}
            title={$LL.chat.userList.invite()}
            onclick={inviteUserToMeeting}
            disabled={chatUser == undefined || chatUser.uuid == undefined}
        />
        {#if showMatrixPeerProfileDebug}
            <RoomOption
                dataTestId="dm-matrix-peer-profile-debug"
                IconComponent={IconSettings}
                title={$LL.chat.matrixPeerProfileDebug.menuItemTitle()}
                tagText={$LL.chat.matrixPeerProfileDebug.menuItemDebugTag()}
                onclick={openMatrixPeerProfileDebug}
            />
        {/if}
    {/if}
    {#if shouldDisplayManageParticipantButton}
        <RoomOption
            dataTestId="manageParticipantOption"
            IconComponent={IconUserEdit}
            title={$LL.chat.manageRoomUsers.roomOption()}
            onclick={openManageParticipantsModal}
        />
    {/if}

    <RoomOption
        IconComponent={$areNotificationsMuted ? IconUnMute : IconMute}
        title={$areNotificationsMuted ? $LL.chat.roomMenu.unmuteRoom() : $LL.chat.roomMenu.muteRoom()}
        onclick={closeMenuAndSetMuteStatus}
    />

    <RoomOption
        IconComponent={IconLogout}
        title={$LL.chat.roomMenu.leaveRoom.label()}
        bg="bg-danger-900 hover:bg-danger"
        onclick={closeMenuAndLeaveRoom}
    />
</div>
