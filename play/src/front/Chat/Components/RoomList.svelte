<script lang="ts">
    import { get } from "svelte/store";

    import { onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, navChat } from "../Stores/ChatStore";
    import { selectedRoomStore } from "../Stores/SelectRoomStore";
    import { isThreadPanelEnabledStore, selectedThreadStore } from "../Stores/SelectedThreadStore";
    import { roomSidePanelStore } from "../Stores/RoomSidePanelStore";
    import {
        hasChatRoomMembershipManagement,
        hasChatRoomModeration,
        hasChatRoomNotificationControl,
        type ChatConversation,
        type ChatRoom,
        type ChatThread,
    } from "../Connection/ChatConnection";
    import { INITIAL_SIDEBAR_WIDTH, loginTokenErrorStore } from "../../Stores/ChatStore";
    import { userIsConnected } from "../../Stores/MenuStore";
    import getCloseImg from "../images/get-close.png";
    import ExternalComponents from "../../Components/ExternalModules/ExternalComponents.svelte";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import Room from "./Room/Room.svelte";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import JoignableRooms from "./Room/JoignableRooms.svelte";
    import ChatLoader from "./ChatLoader.svelte";
    import ChatError from "./ChatError.svelte";
    import RoomFolder from "./RoomFolder.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import ChatHeader from "./ChatHeader.svelte";
    import RequireConnection from "./requireConnection.svelte";
    import RefreshChat from "./RefreshChat.svelte";
    import RoomSidePanel from "./Room/RoomSidePanel.svelte";
    import {
        CHAT_TWO_COLUMN_LAYOUT_LIMIT,
        canDisplayRoomListAndTimeline,
        getRoomSidePanelPlacement,
        shouldShowRoomSidePanelToggle,
        shouldShowRoomTimeline,
    } from "./RoomListLayout";
    import ProximityRoomRow from "./Room/ProximityRoomRow.svelte";
    import { IconChevronUp, IconCloudLock, IconPlus, IconRefresh } from "@wa-icons";

    interface Props {
        sideBarWidth?: number;
    }

    let { sideBarWidth = INITIAL_SIDEBAR_WIDTH }: Props = $props();

    const gameScene = gameManager.getCurrentGameScene();
    /** Same condition as opening the user list from the chat header. */
    const showDirectMessageUserListButton =
        gameScene.room.isChatOnlineListEnabled || gameScene.room.isChatDisconnectedListEnabled;

    const proximityChatRoomManager = gameScene.proximityChatRoomManager;
    const proximityRooms = proximityChatRoomManager.roomsStore;
    const chat = gameManager.chatConnection;
    const shouldRetrySendingEvents = chat.shouldRetrySendingEvents;

    const chatConnectionStatus = chat.connectionStatus;
    const THREAD_PANEL_LAYOUT_LIMIT = INITIAL_SIDEBAR_WIDTH * 3;

    let directRooms = chat.directRooms;
    let rooms = chat.rooms;
    let roomInvitations = chat.invitations;
    let roomFolders = chat.folders;

    let displayDirectRooms = $state(false);
    let displayRooms = $state(false);
    let displayRoomInvitations = $state(false);

    onMount(() => {
        expandOrCollapseRoomsIfEmpty();
    });

    const directRoomsUnsubscriber = directRooms.subscribe((directRooms) =>
        openDirectRoomsIfCollapsedBeforeNewRoom(directRooms),
    );
    const roomsUnsubscriber = rooms.subscribe((rooms) => openRoomsIfCollapsedBeforeNewRoom(rooms));
    const roomInvitationsUnsubscriber = roomInvitations.subscribe((roomInvitations) =>
        openRoomInvitationsIfCollapsedBeforeNewRoom(roomInvitations),
    );

    onDestroy(() => {
        directRoomsUnsubscriber();
        roomsUnsubscriber();
        roomInvitationsUnsubscriber();
        isThreadPanelEnabledStore.set(false);
    });

    async function initChatConnectionEncryption() {
        try {
            await chat.initEndToEndEncryption();
        } catch (error) {
            console.error("Failed to initChatConnectionEncryption", error);
        }
        analyticsClient.startMatrixEncryptionConfiguration();
    }

    const isEncryptionRequiredAndNotSet = chat.isEncryptionRequiredAndNotSet;
    const isGuest = chat.isGuest;

    function openRoomsIfCollapsedBeforeNewRoom(rooms: ChatRoom[]) {
        if (rooms.length !== 0 && displayRooms === false) {
            displayRooms = true;
        }
    }

    function openDirectRoomsIfCollapsedBeforeNewRoom(directRooms: ChatRoom[]) {
        if (directRooms.length !== 0 && displayDirectRooms === false) {
            displayDirectRooms = true;
        }
    }

    function openRoomInvitationsIfCollapsedBeforeNewRoom(roomInvitations: ChatRoom[]) {
        if (roomInvitations.length !== 0 && displayRoomInvitations === false) {
            displayRoomInvitations = true;
        }
    }

    function expandOrCollapseRoomsIfEmpty() {
        displayDirectRooms = $directRooms.length > 0;
        displayRooms = $rooms.length > 0;
        displayRoomInvitations = $roomInvitations.length > 0;
    }

    function toggleDisplayDirectRooms() {
        displayDirectRooms = !displayDirectRooms;
    }

    function toggleDisplayRooms() {
        displayRooms = !displayRooms;
    }

    function toggleDisplayRoomInvitations() {
        displayRoomInvitations = !displayRoomInvitations;
    }

    function isThreadConversation(conversation: ChatConversation | undefined): conversation is ChatThread {
        return conversation?.conversationKind === "thread";
    }

    let filteredDirectRoom = $derived(
        $directRooms
            .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
            .sort((a, b) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1)),
    );
    let filteredRooms = $derived(
        $rooms
            .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
            .sort((a, b) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1)),
    );
    let filteredRoomInvitations = $derived(
        $roomInvitations
            .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
            .sort((a, b) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1)),
    );

    let displayTwoColumnLayout = $derived(
        canDisplayRoomListAndTimeline({
            minimumTwoColumnWidth: CHAT_TWO_COLUMN_LAYOUT_LIMIT,
            sideBarWidth,
        }),
    );
    let displayThreeColumnLayout = $derived(sideBarWidth >= THREAD_PANEL_LAYOUT_LIMIT);
    let selectedRoomWithSidePanel = $derived(
        hasChatRoomMembershipManagement($selectedRoomStore) &&
            hasChatRoomModeration($selectedRoomStore) &&
            hasChatRoomNotificationControl($selectedRoomStore)
            ? $selectedRoomStore
            : undefined,
    );
    let hasSelectedRoomWithSidePanel = $derived(selectedRoomWithSidePanel !== undefined);
    let showRoomSidePanelToggle = $derived(shouldShowRoomSidePanelToggle(hasSelectedRoomWithSidePanel));
    let roomSidePanelPlacement = $derived(
        getRoomSidePanelPlacement({
            canDisplayThirdColumn: displayThreeColumnLayout,
            hasCompatibleRoom: hasSelectedRoomWithSidePanel,
            isOpen: $roomSidePanelStore.isOpen,
        }),
    );
    let showRoomSidePanelInThirdColumn = $derived(roomSidePanelPlacement === "third-column");
    let showRoomSidePanelInTimelineColumn = $derived(roomSidePanelPlacement === "timeline-column");
    $effect(() => {
        isThreadPanelEnabledStore.set(hasSelectedRoomWithSidePanel);
    });
    $effect(() => {
        if (!displayThreeColumnLayout || !isThreadConversation($selectedRoomStore)) {
            return;
        }
        const selectedThread = $selectedRoomStore;
        selectedRoomStore.set(selectedThread.parentRoom);
        selectedThreadStore.set(selectedThread);
    });
    $effect(() => {
        if (hasSelectedRoomWithSidePanel || !$selectedThreadStore) {
            return;
        }
        selectedRoomStore.set($selectedThreadStore);
        selectedThreadStore.clear();
    });
    let roomListGridClass = $derived(
        showRoomSidePanelInThirdColumn
            ? "grid-cols-[335px_minmax(0,1fr)_360px]"
            : displayTwoColumnLayout && $navChat.key === "chat"
              ? "grid-cols-[auto_minmax(0,1fr)]"
              : "grid-cols-[1fr]",
    );
</script>

<div class="overflow-auto h-full grid grid-rows-[1fr_auto] {roomListGridClass}">
    {#if $selectedRoomStore === undefined || displayTwoColumnLayout}
        <div
            class="w-full flex flex-col border border-solid border-y-0 border-l-0 border-white/10 relative overflow-y-auto overflow-x-none"
            style={displayTwoColumnLayout ? `width:335px ;flex : 0 0 auto` : ``}
        >
            {#if $shouldRetrySendingEvents}
                <RefreshChat />
            {/if}
            <ChatHeader />
            <div
                class="relative pt-2 {$isEncryptionRequiredAndNotSet === true && $isGuest === false
                    ? ' h-[calc(100%-2rem)]'
                    : 'h-full'}"
            >
                {#if $chatConnectionStatus === "CONNECTING" && $userIsConnected}
                    <ChatLoader label={$LL.chat.connecting()} />
                {/if}
                {#if $chatConnectionStatus === "ON_ERROR" && $userIsConnected}
                    <ChatError />
                {/if}

                {#if !$userIsConnected && gameManager.getCurrentGameScene().room.isMatrixChatEnabled}
                    <RequireConnection />
                {:else if $loginTokenErrorStore}
                    <RequireConnection>
                        {#snippet emoji()}
                            <IconRefresh font-size="50" />
                        {/snippet}
                        {#snippet title()}
                            {$LL.chat.loginTokenError()}
                        {/snippet}
                        {#snippet buttonLabel()}
                            {$LL.chat.reconnect()}
                        {/snippet}
                    </RequireConnection>
                {/if}

                {#if $proximityRooms.length > 0}
                    <div
                        class="px-2 py-3 border border-solid border-x-0 border-t border-y-0 border-b-0 border-white/10"
                    >
                        <div class="flex flex-col">
                            <ShowMore
                                items={$proximityRooms}
                                maxNumber={8}
                                idKey="id"
                                showNothingToDisplayMessage={false}
                            >
                                {#snippet children({ item: room })}
                                    <ProximityRoomRow {room} />
                                {/snippet}
                            </ShowMore>
                        </div>
                    </div>
                {/if}
                {#if $chatConnectionStatus === "ONLINE"}
                    {#if $joignableRoom.length > 0 && $chatSearchBarValue.trim() !== ""}
                        <p class="p-0 m-0 text-gray-400">{$LL.chat.availableRooms()}</p>
                        <div class="flex flex-col">
                            {#each $joignableRoom as room (room.id)}
                                <JoignableRooms {room} />
                            {/each}
                        </div>
                    {/if}
                    {#if filteredRoomInvitations.length > 0}
                        <button
                            class="group relative m-0 px-3 rounded-none text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center border border-solid border-x-0 border-t border-b-0 border-white/10"
                            onclick={toggleDisplayRoomInvitations}
                        >
                            <div class="text-white text-sm font-bold tracking-widest uppercase grow text-start">
                                {$LL.chat.invitations()}
                            </div>
                            <div
                                class="transition-all group-hover:bg-white/10 p-1 rounded aspect-square flex items-center justify-center text-white"
                            >
                                <IconChevronUp
                                    class={`transform transition ${!displayRoomInvitations ? "" : "rotate-180"}`}
                                />
                            </div>
                        </button>
                        {#if displayRoomInvitations}
                            <div class="flex flex-col overflow-auto ps-3 pr-4 pb-3">
                                <ShowMore items={filteredRoomInvitations} maxNumber={8} idKey="id">
                                    {#snippet children({ item: room })}
                                        <RoomInvitation {room} />
                                    {/snippet}
                                </ShowMore>
                            </div>
                        {/if}
                    {/if}

                    <div
                        class="group relative px-3 m-0 rounded-none text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex items-center gap-1 border border-solid border-x-0 border-t border-b-0 border-white/10"
                    >
                        <button
                            type="button"
                            class="flex items-center min-w-0 flex-1 text-start m-0 p-0 h-full bg-transparent border-0 cursor-pointer text-inherit rounded-none appearance-none"
                            onclick={toggleDisplayDirectRooms}
                        >
                            <div class="text-white text-sm font-bold tracking-widest uppercase truncate">
                                {$LL.chat.people()}
                            </div>
                        </button>
                        {#if showDirectMessageUserListButton}
                            <button
                                type="button"
                                data-testid="directMessageOpenUserList"
                                class="transition-all group-hover:bg-white/10 p-1 rounded aspect-square flex items-center justify-center text-white shrink-0 m-0"
                                aria-label={$LL.chat.users()}
                                title={$LL.chat.users()}
                                onclick={(event) => {
                                    event.stopPropagation();
                                    navChat.switchToUserList();
                                }}
                            >
                                <IconPlus />
                            </button>
                        {/if}
                        <button
                            type="button"
                            class="transition-all group-hover:bg-white/10 p-1 rounded aspect-square flex items-center justify-center text-white shrink-0 m-0"
                            aria-expanded={displayDirectRooms}
                            onclick={(event) => {
                                event.stopPropagation();
                                toggleDisplayDirectRooms();
                            }}
                        >
                            <IconChevronUp class={`transform transition ${!displayDirectRooms ? "" : "rotate-180"}`} />
                        </button>
                    </div>

                    {#if displayDirectRooms}
                        <div class="flex flex-col px-2 pb-2">
                            <ShowMore items={filteredDirectRoom} maxNumber={8} idKey="id">
                                {#snippet children({ item: room })}
                                    <Room {room} />
                                {/snippet}
                            </ShowMore>
                        </div>
                    {/if}

                    <div class="flex items-center space-x-2 grow m-0 p-0">
                        <!-- TODO : use div instead of button to avoid focus issues try to find a better solution -->
                        <!-- svelte-ignore a11y_click_events_have_key_events -->
                        <!-- svelte-ignore a11y_no_static_element_interactions -->
                        <div
                            class="group relative px-3 m-0 mb-2 rounded-none text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center border border-solid border-x-0 border-t border-b-0 border-white/10"
                            onclick={toggleDisplayRooms}
                            data-testid="roomAccordeon"
                        >
                            <div class="flex items-center space-x-2 grow m-0 p-0">
                                <div class="text-white text-sm font-bold tracking-widest uppercase grow text-start">
                                    {$LL.chat.rooms()}
                                </div>
                            </div>
                            <CreateRoomOrFolderOption parentID={undefined} parentName="" folder={undefined} />
                            <button
                                class="transition-all group-hover:bg-white/10 p-1 rounded aspect-square flex items-center justify-center text-white"
                            >
                                <IconChevronUp class={`transform transition ${!displayRooms ? "" : "rotate-180"}`} />
                            </button>
                        </div>
                    </div>
                    {#if displayRooms}
                        <div class="px-2 pb-2">
                            <ShowMore items={filteredRooms} maxNumber={8} idKey="id">
                                {#snippet children({ item: room })}
                                    <Room {room} />
                                {/snippet}
                            </ShowMore>
                        </div>
                    {/if}
                    <!--roomBySpace-->
                    {#each Array.from($roomFolders.values()) as rootRoomFolder (rootRoomFolder.id)}
                        <RoomFolder folder={rootRoomFolder} rootFolder={true} />
                    {/each}
                {/if}
            </div>
        </div>
    {/if}
    {#if $selectedRoomStore !== undefined}
        <div class="overflow-y-auto min-w-0">
            {#if showRoomSidePanelInTimelineColumn && selectedRoomWithSidePanel}
                <RoomSidePanel room={selectedRoomWithSidePanel} showCloseButton closeOnTimelineFocus />
            {:else if shouldShowRoomTimeline(roomSidePanelPlacement)}
                {#key $selectedRoomStore.id}
                    <RoomTimeline room={$selectedRoomStore} {showRoomSidePanelToggle} />
                {/key}
            {/if}
        </div>
    {:else if $selectedRoomStore === undefined && displayTwoColumnLayout}
        <div class="flex flex-col flex-1 ps-4 items-center pt-8">
            <div class="text-center px-3 max-w-md">
                <img src={getCloseImg} alt={$LL.chat.getCloserTitle()} draggable="false" />
                <div class="text-lg font-bold text-center">{$LL.chat.noRoomOpen()}</div>
                <div class="text-sm opacity-50 text-center">
                    {$LL.chat.noRoomOpenDescription()}
                </div>
            </div>
        </div>
    {/if}

    {#if showRoomSidePanelInThirdColumn && selectedRoomWithSidePanel}
        <div class="overflow-y-auto min-w-0 border border-solid border-y-0 border-r-0 border-white/10">
            <RoomSidePanel room={selectedRoomWithSidePanel} />
        </div>
    {/if}

    <div class="w-full flex flex-col col-span-full h-fit">
        <ExternalComponents zone="chatBand" />
        {#if $isEncryptionRequiredAndNotSet === true && $isGuest === false}
            <div class="w-full">
                <button
                    data-testid="restoreEncryptionButton"
                    onclick={(event) => {
                        event.stopPropagation();
                        initChatConnectionEncryption().catch((error) => {
                            console.error("Failed to initialize chat encryption", error);
                        });
                    }}
                    class="text-white flex gap-2 justify-center w-full bg-neutral hover:bg-neutral-600 hover:brightness-100 m-0 rounded-none py-2 px-3 appearance-none"
                >
                    <IconCloudLock font-size="20" />
                    <div class="text-sm font-bold grow text-start">
                        {$LL.chat.e2ee.encryptionNotConfigured()}
                    </div>
                    <div class="text-xs rounded border border-solid border-white py-0.5 px-1.5 group-hover:bg-white/10">
                        {$LL.chat.e2ee.configure()}
                    </div>
                </button>
            </div>
        {/if}
    </div>
</div>
