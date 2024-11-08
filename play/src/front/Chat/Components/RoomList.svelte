<script lang="ts">
    import { get } from "svelte/store";
    // eslint-disable-next-line import/no-unresolved
    import { onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, navChat, selectedRoomStore } from "../Stores/ChatStore";
    import { ChatRoom } from "../Connection/ChatConnection";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { UserProviderMerger } from "../UserProviderMerger/UserProviderMerger";
    import WokaFromUserId from "../../Components/Woka/WokaFromUserId.svelte";
    import getCloseImg from "../images/get-close.png";
    import messageSmileyImg from "../images/message-smiley.svg";
    import LoadingSmall from "../images/loading-small.svelte";
    import {
        ENABLE_CHAT,
        ENABLE_CHAT_DISCONNECTED_LIST,
        ENABLE_CHAT_ONLINE_LIST,
    } from "../../Enum/EnvironmentVariable";
    import Room from "./Room/Room.svelte";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import JoignableRooms from "./Room/JoignableRooms.svelte";
    import ChatLoader from "./ChatLoader.svelte";
    import ChatError from "./ChatError.svelte";
    import RoomFolder from "./RoomFolder.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import { IconChevronUp, IconCloudLock, IconMessageCircle2, IconSearch, IconUsers, IconX } from "@wa-icons";

    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const gameScene = gameManager.getCurrentGameScene();

    const proximityChatRoom = gameManager.getCurrentGameScene().proximityChatRoom;
    const userProviderMergerPromise = gameScene.userProviderMerger;
    const chat = gameManager.chatConnection;

    const chatConnectionStatus = chat.connectionStatus;
    const CHAT_LAYOUT_LIMIT = INITIAL_SIDEBAR_WIDTH * 2;

    let directRooms = chat.directRooms;
    let rooms = chat.rooms;
    //TODO : Make a distinction between invitations to a room or a space;
    let roomInvitations = chat.invitations;
    let roomFolders = chat.roomFolders;
    let proximityHasUnreadMessages = proximityChatRoom.hasUnreadMessages;

    let displayDirectRooms = false;
    let displayRooms = false;
    let displayRoomInvitations = false;

    const DONE_TYPING_INTERVAL = 2000;
    let searchValue = "";
    let typingTimer: ReturnType<typeof setTimeout>;

    onMount(() => {
        expandOrCollapseRoomsIfEmpty();
    });

    const directRoomsUnsubscriber = rooms.subscribe((rooms) => openRoomsIfCollapsedBeforeNewRoom(rooms));
    const roomInvitationsUnsubscriber = roomInvitations.subscribe((roomInvitations) =>
        openRoomInvitationsIfCollapsedBeforeNewRoom(roomInvitations)
    );

    onDestroy(() => {
        directRoomsUnsubscriber();
        roomInvitationsUnsubscriber();
    });

    let searchLoader = false;
    let searchActive = false;
    let userWorldCount = gameScene.worldUserCounter;

    const showNavBar = (ENABLE_CHAT_ONLINE_LIST || ENABLE_CHAT_DISCONNECTED_LIST) && ENABLE_CHAT;

    const handleKeyUp = (userProviderMerger: UserProviderMerger) => {
        clearTimeout(typingTimer);
        typingTimer = setTimeout(() => {
            searchLoader = true;
            if ($navChat === "chat" && $chatSearchBarValue.trim() !== "") {
                searchAccessibleRooms();
            }

            userProviderMerger.setFilter($chatSearchBarValue).finally(() => {
                searchLoader = false;
            });
        }, DONE_TYPING_INTERVAL);
    };

    const handleKeyDown = () => {
        if (searchValue === "") joignableRoom.set([]);
        clearTimeout(typingTimer);
    };

    const searchAccessibleRooms = () => {
        chat.searchAccessibleRooms($chatSearchBarValue)
            .then((chatRooms: { id: string; name: string | undefined }[]) => {
                joignableRoom.set(chatRooms);
            })
            .finally(() => {
                searchLoader = false;
            });
        return;
    };

    async function initChatConnectionEncryption() {
        try {
            await chat.initEndToEndEncryption();
        } catch (error) {
            console.error("Failed to initChatConnectionEncryption", error);
        }
    }

    const chatStatusStore = chat.connectionStatus;
    $: isEncryptionRequiredAndNotSet = chat.isEncryptionRequiredAndNotSet;
    $: isGuest = chat.isGuest;

    function openRoomsIfCollapsedBeforeNewRoom(rooms: ChatRoom[]) {
        if (rooms.length !== 0 && displayRooms === false) {
            displayRooms = true;
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

    function toggleDisplayProximityChat() {
        selectedRoomStore.set(proximityChatRoom);
        proximityChatRoom.hasUnreadMessages.set(false);
    }

    $: filteredDirectRoom = $directRooms
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));

    $: filteredRooms = $rooms
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));
    $: filteredRoomInvitations = $roomInvitations
        .filter(({ name }) => get(name).toLocaleLowerCase().includes($chatSearchBarValue.toLocaleLowerCase()))
        .sort((a: ChatRoom, b: ChatRoom) => (a.lastMessageTimestamp > b.lastMessageTimestamp ? -1 : 1));

    $: displayTwoColumnLayout = sideBarWidth >= CHAT_LAYOUT_LIMIT;

    const isFoldersOpen: { [key: string]: boolean } = {};

    $roomFolders.forEach((folder) => {
        if (!(folder.id in isFoldersOpen)) {
            isFoldersOpen[folder.id] = false;
        }
    });
</script>

<div
    class="tw-flex-1 tw-flex tw-flex-row tw-overflow-auto"
    class:!tw-flex-row={sideBarWidth > INITIAL_SIDEBAR_WIDTH * 2 && $navChat === "chat"}
>
    {#if $selectedRoomStore === undefined || displayTwoColumnLayout}
        <div
            class="tw-w-full tw-border tw-border-solid tw-border-y-0 tw-border-l-0 tw-border-white/10 tw-relative tw-overflow-y-auto tw-overflow-x-none"
            style={displayTwoColumnLayout ? `width:335px ;flex : 0 0 auto` : ``}
        >
            <div class="tw-p-2 tw-flex tw-items-center tw-absolute tw-w-full tw-z-40">
                <div class={searchActive ? "tw-hidden" : ""}>
                    {#if $navChat === "chat"}
                        {#if showNavBar}
                            <button
                                class="userList tw-p-3 hover:tw-bg-white/10 tw-rounded-xl tw-aspect-square tw-w-12"
                                on:click={() => navChat.switchToUserList()}
                            >
                                <IconUsers font-size="20" />
                            </button>
                        {/if}
                    {:else}
                        <button
                            class="tw-p-3 hover:tw-bg-white/10 tw-rounded-2xl tw-aspect-square tw-w-12"
                            on:click={() => navChat.switchToChat()}
                        >
                            <IconMessageCircle2 font-size="20" />
                        </button>
                    {/if}
                </div>
                <div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-grow">
                    <div class="tw-text-md tw-font-bold tw-h-5 {searchActive ? 'tw-hidden' : ''}">
                        {$LL.chat.chat()}
                    </div>
                    <div
                        class="tw-flex tw-items-center tw-justify-center tw-text-success tw-space-x-1.5 {searchActive
                            ? 'tw-hidden'
                            : ''}"
                    >
                        <div
                            class="tw-text-xs tw-aspect-square tw-min-w-5 tw-h-5 tw-px-1 tw-border tw-border-solid tw-border-success tw-flex tw-items-center tw-justify-center tw-font-bold tw-rounded"
                        >
                            {$userWorldCount}
                        </div>
                        <div class="tw-text-xs tw-font-bold">{$LL.chat.onlineUsers()}</div>
                    </div>
                </div>
                <div class="">
                    {#if $chatStatusStore !== "OFFLINE"}
                        <button
                            class="tw-p-3 hover:tw-bg-white/10 tw-rounded-xl tw-aspect-square tw-w-12 tw-relative tw-z-50"
                            on:click={() => (searchActive = !searchActive)}
                        >
                            {#if searchLoader}
                                <LoadingSmall />
                            {/if}
                            {#if !searchActive}
                                <IconSearch font-size="20" />
                            {:else}
                                <IconX font-size="20" />
                            {/if}
                        </button>
                    {:else}
                        <div class="tw-w-12" />
                    {/if}
                    <!-- searchbar -->
                    {#if searchActive && $chatStatusStore !== "OFFLINE"}
                        {#await userProviderMergerPromise}
                            <div />
                        {:then userProviderMerger}
                            <div class="tw-absolute tw-w-full tw-h-full tw-z-40 tw-right-0 tw-top-0 tw-bg-contrast/30">
                                <input
                                    autocomplete="new-password"
                                    class="wa-searchbar tw-block tw-text-white placeholder:tw-text-white/50 tw-w-full placeholder:tw-text-sm tw-border-none tw-pl-6 tw-pr-20 tw-bg-transparent tw-py-3 tw-text-base tw-h-full"
                                    placeholder={$navChat === "users" ? $LL.chat.searchUser() : $LL.chat.searchChat()}
                                    on:keydown={handleKeyDown}
                                    on:keyup={() => handleKeyUp(userProviderMerger)}
                                    bind:value={$chatSearchBarValue}
                                />
                            </div>
                        {/await}
                    {/if}
                </div>
            </div>
            <div
                class="tw-relative tw-pt-[72px] {$isEncryptionRequiredAndNotSet === true && $isGuest === false
                    ? ' tw-h-[calc(100%-2rem)]'
                    : 'tw-h-full'}"
            >
                {#if $chatConnectionStatus === "CONNECTING" && $userIsConnected}
                    <ChatLoader label={$LL.chat.connecting()} />
                {/if}
                {#if $chatConnectionStatus === "ON_ERROR" && $userIsConnected}
                    <ChatError />
                {/if}

                {#if !$userIsConnected}
                    <div class="tw-flex-col tw-items-center tw-justify-center tw-text-center tw-px-4 tw-py-12">
                        <img src={messageSmileyImg} alt="Smiley happy" />
                        <div class="tw-w-full tw-text-center tw-text-lg tw-font-bold">
                            {$LL.chat.requiresLoginForChat()}
                        </div>
                        <div class="tw-flex tw-justify-center">
                            <a
                                class="tw-flex tw-justify-center tw-rounded-lg tw-h-10 tw-bg-secondary hover:tw-bg-secondary-800 hover:tw-no-underline hover:tw-text-white tw-no-underline tw-transition-all tw-items-center tw-my-4 tw-text-base tw-px-8 tw-text-white"
                                href="/login"
                                on:click={() => analyticsClient.login()}
                            >
                                {$LL.menu.profile.login()}
                            </a>
                        </div>
                    </div>
                {/if}

                <div
                    class="tw-px-2 tw-py-3 tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-y-0 tw-border-b-0 tw-border-white/10"
                >
                    <div
                        class="tw-group tw-relative tw-px-3 tw-rounded-md tw-h-11 tw-w-full tw-flex tw-space-x-2 tw-items-center {$proximityHasUnreadMessages
                            ? 'hover:tw-bg-contrast-200/20 tw-bg-contrast-200/10'
                            : 'hover:tw-bg-contrast-200/10'}"
                    >
                        <button
                            class="tw-flex tw-items-center tw-space-x-2 tw-grow tw-m-0 tw-p-0"
                            on:click={toggleDisplayProximityChat}
                            data-testid="toggleDisplayProximityChat"
                        >
                            <div class="tw-relative">
                                <div
                                    class="tw-rounded-full tw-bg-white/10 tw-h-7 tw-w-7 tw-border tw-border-solid tw-text-white tw-flex tw-items-center tw-justify-center tw-p-[1px] tw-relative {$proximityHasUnreadMessages
                                        ? 'tw-border-white'
                                        : 'tw-border-white/70'}"
                                >
                                    <div class="tw-absolute tw-overflow-hidden tw-w-full tw-h-full tw-rounded-full">
                                        <div
                                            class="tw-translate-y-[3px] -tw-translate-x-[3px] group-hover:tw-translate-y-[0] tw-transition-all"
                                        >
                                            <WokaFromUserId
                                                userId={-1}
                                                customWidth="32px"
                                                customHeight="32px"
                                                placeholderSrc=""
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                class="tw-cursor-default tw-text-sm tw-grow tw-text-left tw-pl-1 {$proximityHasUnreadMessages
                                    ? 'tw-text-white tw-font-bold'
                                    : 'tw-text-white/75'}"
                            >
                                {$LL.chat.proximity()}
                            </div>
                            {#if $proximityHasUnreadMessages}
                                <div class="tw-flex tw-items-center tw-justify-center tw-h-7 tw-w-7 tw-relative">
                                    <div
                                        class="tw-rounded-full tw-bg-secondary-200 tw-h-2 tw-w-2 tw-animate-ping tw-absolute"
                                    />
                                    <div class="tw-rounded-full tw-bg-secondary-200 tw-h-1.5 tw-w-1.5 tw-absolute" />
                                </div>
                            {/if}
                        </button>
                    </div>
                </div>
                {#if $chatConnectionStatus === "ONLINE"}
                    {#if $joignableRoom.length > 0 && $chatSearchBarValue.trim() !== ""}
                        <p class="tw-p-0 tw-m-0 tw-text-gray-400">{$LL.chat.availableRooms()}</p>
                        <div class="tw-flex tw-flex-col">
                            {#each $joignableRoom as room (room.id)}
                                <JoignableRooms {room} />
                            {/each}
                        </div>
                    {/if}
                    {#if filteredRoomInvitations.length > 0}
                        <button
                            class="tw-group tw-relative tw-m-0 tw-px-3 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-b-0 tw-border-white/10"
                            on:click={toggleDisplayRoomInvitations}
                        >
                            <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                                {$LL.chat.invitations()}
                            </div>
                            <div
                                class="tw-transition-all group-hover:tw-bg-white/10 tw-p-1 tw-rounded-lg tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-white"
                            >
                                <IconChevronUp
                                    class={`tw-transform tw-transition ${
                                        !displayRoomInvitations ? "" : "tw-rotate-180"
                                    }`}
                                />
                            </div>
                        </button>
                        {#if displayRoomInvitations}
                            <div class="tw-flex tw-flex-col tw-overflow-auto tw-pl-3 tw-pr-4 tw-pb-3">
                                <ShowMore items={filteredRoomInvitations} maxNumber={8} idKey="id" let:item={room}>
                                    <RoomInvitation {room} />
                                </ShowMore>
                            </div>
                        {/if}
                    {/if}

                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        class="tw-group tw-relative tw-px-3 tw-m-0 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-b-0 tw-border-white/10"
                        on:click={toggleDisplayDirectRooms}
                    >
                        <div class="tw-flex tw-items-center tw-space-x-2 tw-m-0 tw-p-0 tw-grow">
                            <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                                {$LL.chat.people()}
                            </div>
                            <div
                                class="tw-transition-all group-hover:tw-bg-white/10 tw-p-1 tw-rounded-lg tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-white"
                            >
                                <IconChevronUp
                                    class={`tw-transform tw-transition ${!displayDirectRooms ? "" : "tw-rotate-180"}`}
                                />
                            </div>
                        </div>
                    </div>

                    {#if displayDirectRooms}
                        <div class="tw-flex tw-flex-col tw-px-2 tw-pb-2">
                            <ShowMore items={filteredDirectRoom} maxNumber={8} idKey="id" let:item={room}>
                                <Room {room} />
                            </ShowMore>
                        </div>
                    {/if}

                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        class="tw-group tw-relative tw-px-3 tw-m-0 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-b-0 tw-border-white/10"
                        on:click={toggleDisplayRooms}
                        data-testid="roomAccordeon"
                    >
                        <div class="tw-flex tw-items-center tw-space-x-2 tw-grow tw-m-0 tw-p-0">
                            <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                                {$LL.chat.rooms()}
                            </div>
                        </div>
                        {#if $isGuest === false}
                            <CreateRoomOrFolderOption />
                        {/if}
                        <div
                            class="tw-transition-all group-hover:tw-bg-white/10 tw-p-1 tw-rounded-lg tw-aspect-square tw-flex tw-items-center tw-justify-center tw-text-white"
                        >
                            <IconChevronUp
                                class={`tw-transform tw-transition ${!displayRooms ? "" : "tw-rotate-180"}`}
                            />
                        </div>
                    </div>
                    {#if displayRooms}
                        <div class="tw-px-2 tw-pb-2">
                            <ShowMore items={filteredRooms} maxNumber={8} idKey="id" let:item={room}>
                                <Room {room} />
                            </ShowMore>
                        </div>
                        <!--roomBySpace-->
                        {#each Array.from($roomFolders.values()) as rootRoomFolder (rootRoomFolder.id)}
                            <RoomFolder
                                bind:isOpen={isFoldersOpen[rootRoomFolder.id]}
                                name={rootRoomFolder.name}
                                folders={rootRoomFolder.folders}
                                rooms={rootRoomFolder.rooms}
                                isGuest={$isGuest}
                                id={rootRoomFolder.id}
                            />
                        {/each}
                    {/if}
                {/if}
            </div>
            {#if $isEncryptionRequiredAndNotSet === true && $isGuest === false}
                <div class="tw-sticky tw-bottom-0 tw-w-full tw-backdrop-blur-md tw-mt-3">
                    <button
                        data-testid="restoreEncryptionButton"
                        on:click|stopPropagation={initChatConnectionEncryption}
                        class="tw-text-white tw-flex tw-gap-2 tw-justify-center tw-w-full tw-bg-white/20 hover:tw-bg-neutral hover:tw-brightness-100 tw-m-0 tw-rounded-none tw-py-2 tw-px-3 tw-appearance-none"
                    >
                        <IconCloudLock font-size="20" />
                        <div class="tw-text-sm tw-font-bold tw-grow tw-text-left">
                            {$LL.chat.e2ee.encryptionNotConfigured()}
                        </div>
                        <div
                            class="tw-text-xs tw-rounded tw-border tw-border-solid tw-border-white tw-py-0.5 tw-px-1.5 group-hover:tw-bg-white/10"
                        >
                            {$LL.chat.e2ee.configure()}
                        </div>
                    </button>
                </div>
            {/if}
        </div>
    {/if}
    {#if $selectedRoomStore !== undefined}
        <RoomTimeline room={$selectedRoomStore} />
    {:else if $selectedRoomStore === undefined && sideBarWidth >= CHAT_LAYOUT_LIMIT}
        <div class="tw-flex tw-flex-col tw-flex-1 tw-pl-4">
            <div class="tw-text-center tw-px-3 tw-max-w-md">
                <img src={getCloseImg} alt="Discussion bubble" />
                <div class="tw-text-lg tw-font-bold tw-text-center">{$LL.chat.getCloserTitle()}</div>
                <div class="tw-text-sm tw-opacity-50 tw-text-center">
                    Et ducimus cum et dolor. Consequatur ab voluptas qui soluta. Aspernatur natus nisi illo saepe
                    doloribus vitae.
                </div>
            </div>
            <p class="tw-self-center tw-text-md tw-text-gray-500">{$LL.chat.nothingToDisplay()}</p>
        </div>
    {/if}
</div>
