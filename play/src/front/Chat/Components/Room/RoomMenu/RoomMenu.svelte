<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { get } from "svelte/store";
    import type { Readable } from "svelte/store";
    import { AskPositionMessage_AskType } from "@workadventure/messages";
    import {
        type ChatRoom,
        type ChatRoomMembershipManagement,
        type ChatUser,
    } from "../../../Connection/ChatConnection";
    import { localUserStore } from "../../../../Connection/LocalUserStore";
    import { notificationPlayingStore } from "../../../../Stores/NotificationStore";
    import { draftMessageService } from "../../../Services/DraftMessageService";
    import LL from "../../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../../../Administration/AnalyticsClient";
    import { scriptUtils } from "../../../../Api/ScriptUtils";
    import type { UserProviderMerger } from "../../../UserProviderMerger/UserProviderMerger";
    import RoomOption from "./RoomOption.svelte";
    import { IconDots, IconMapPin, IconCamera, IconUserPlus, IconLogout } from "@wa-icons";

    export let room: ChatRoom & ChatRoomMembershipManagement;
    const roomType = room.type;
    let optionButtonRef: HTMLButtonElement | undefined = undefined;
    let hideOptions = true;
    let usersByRoomStore:
        | Readable<Map<string | undefined, { roomName: string | undefined; users: ChatUser[] }>>
        | undefined = undefined;

    const { connection } = gameManager.getCurrentGameScene();

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

    $: members = get(room.members);
    $: usersByRoomMap = usersByRoomStore && $usersByRoomStore ? $usersByRoomStore : new Map();

    // Flatten usersByRoomMap into a list of users with playUri from their room
    $: usersWithRoomPlayUri = (() => {
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
    })();

    $: matrixChatUser = $roomType === "direct" ? members.find((u) => u.id !== localUserStore.getChatId()) : undefined;

    $: chatUser = usersWithRoomPlayUri.find((u) => u.chatId === matrixChatUser?.id);
    $: isInTheSameMap = chatUser?.playUri === gameManager.getCurrentGameScene().roomUrl;
    $: leaveRoomNotification = $LL.chat.roomMenu.leaveRoom.notification();

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

    function closeMenuAndLeaveRoom() {
        toggleRoomOptions();
        const roomId = room.id;
        room.leaveRoom()
            .then(() => {
                draftMessageService.deleteDraft(`${roomId}-${localUserStore.getChatId() ?? "0"}`);
                notificationPlayingStore.playNotification(leaveRoomNotification);
            })
            .catch(() => console.error("Failed to leave room"));
    }
</script>

<button
    data-testid="toggleRoomMenu"
    bind:this={optionButtonRef}
    on:click|preventDefault|stopPropagation={toggleRoomOptions}
    class="m-0 p-0 flex items-center justify-center h-7 w-7 hover:bg-white/10 rounded"
>
    <IconDots font-size="16" />
</button>
<!-- svelte-ignore a11y-no-static-element-interactions -->
<div
    on:mouseleave={toggleRoomOptions}
    class="bg-contrast/50 backdrop-blur-md rounded-md overflow-hidden z-[99] w-max end-2 top-10 p-1"
    class:absolute={optionButtonRef !== undefined}
    class:hidden={hideOptions}
>
    {#if $roomType === "direct"}
        <!-- Create Room Option to talk to the user -->
        <RoomOption
            IconComponent={IconCamera}
            title={$LL.chat.userList.TalkTo()}
            on:click={talkToUser}
            disabled={chatUser == undefined || chatUser.uuid == undefined}
        />
        <!-- Create Room Option to locate to the user -->
        <RoomOption
            IconComponent={IconMapPin}
            title={$LL.chat.userList.follow()}
            on:click={locateUser}
            disabled={chatUser == undefined || isInTheSameMap == false}
        />
        <!-- Create Room Option to invite the user to the meeting -->
        <RoomOption
            IconComponent={IconUserPlus}
            title={$LL.chat.userList.invite()}
            on:click={inviteUserToMeeting}
            disabled={chatUser == undefined || chatUser.uuid == undefined}
        />
        <RoomOption
            IconComponent={IconLogout}
            title={$LL.chat.roomMenu.leaveRoom.label()}
            bg="bg-danger-900 hover:bg-danger"
            on:click={closeMenuAndLeaveRoom}
        />
    {/if}
</div>
