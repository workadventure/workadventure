<script lang="ts">
    import { get } from "svelte/store";
    // eslint-disable-next-line import/no-unresolved
    import { onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, navChat, selectedRoom } from "../Stores/ChatStore";
    import { ChatRoom } from "../Connection/ChatConnection";
    import { INITIAL_SIDEBAR_WIDTH } from "../../Stores/ChatStore";
    import { userIsConnected } from "../../Stores/MenuStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { UserProviderMerger } from "../UserProviderMerger/UserProviderMerger";
    import Room from "./Room/Room.svelte";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import RoomInvitation from "./Room/RoomInvitation.svelte";
    import JoignableRooms from "./Room/JoignableRooms.svelte";
    import ChatLoader from "./ChatLoader.svelte";
    import ChatError from "./ChatError.svelte";
    import RoomFolder from "./RoomFolder.svelte";
    import CreateRoomOrFolderOption from "./Room/CreateRoomOrFolderOption.svelte";
    import ShowMore from "./ShowMore.svelte";
    import { IconChevronDown, IconChevronRight, IconChevronUp } from "@wa-icons";

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
        selectedRoom.set(proximityChatRoom);
        proximityChatRoom.hasUnreadMessages.set(false);
    }

    async function initChatConnectionEncryption() {
        try {
            await chat.initEndToEndEncryption();
        } catch (error) {
            console.error("Failed to initChatConnectionEncryption", error);
        }
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

    $: isGuest = chat.isGuest;
    const chatStatusStore = chat.connectionStatus;
    $: isEncryptionRequiredAndNotSet = chat.isEncryptionRequiredAndNotSet;

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
    {#if $selectedRoom === undefined || displayTwoColumnLayout}
        <div
            class="tw-w-full tw-border tw-border-solid tw-border-y-0 tw-border-l-0 tw-border-white/10 tw-relative tw-overflow-y-auto"
            style={displayTwoColumnLayout ? `width:335px ;flex : 0 0 auto` : ``}
        >
            <div class="tw-p-2 tw-flex tw-items-center">
                <div>
                    {#if $navChat === "chat"}
                        <button
                            class="tw-p-3 hover:tw-bg-white/10 tw-rounded-2xl tw-aspect-square tw-w-12"
                            on:click={() => navChat.set("users")}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-users"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
                                <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
                            </svg>
                        </button>
                    {:else}
                        <button
                            class="tw-p-3 hover:tw-bg-white/10 tw-rounded-2xl tw-aspect-square tw-w-12"
                            on:click={() => navChat.set("chat")}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                class="icon icon-tabler icon-tabler-message-circle-2"
                                width="24"
                                height="24"
                                viewBox="0 0 24 24"
                                stroke-width="1.5"
                                stroke="#ffffff"
                                fill="none"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            >
                                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                                <path d="M3 20l1.3 -3.9a9 8 0 1 1 3.4 2.9l-4.7 1" />
                            </svg>
                        </button>
                    {/if}
                </div>
                <div class="tw-flex tw-flex-col tw-items-center tw-justify-center tw-grow">
                    <div class="tw-text-md tw-font-bold tw-h-5">Chat</div>
                    <div class="tw-flex tw-items-center tw-justify-center tw-text-success tw-space-x-1.5">
                        <div
                            class="tw-text-xs tw-aspect-square tw-w-5 tw-h-5 tw-border tw-border-solid tw-border-success tw-flex tw-items-center tw-justify-center tw-font-bold tw-rounded"
                        >
                            14
                        </div>
                        <!-- TODO HUGO -->
                        <div class="tw-text-xs tw-font-bold">Utilisateurs en ligne</div>
                        <!-- TODO HUGO -->
                    </div>
                </div>
                <div>
                    <button
                        class="tw-p-3 hover:tw-bg-white/10 tw-rounded-2xl tw-aspect-square tw-w-12"
                        on:click={() => navChat.set("chat")}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            class="icon icon-tabler icon-tabler-search"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="#ffffff"
                            fill="none"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                            <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                            <path d="M21 21l-6 -6" />
                        </svg>
                    </button>

                    {#await userProviderMergerPromise}
                        <div />
                    {:then userProviderMerger}
                        {#if $chatStatusStore !== "OFFLINE"}
                            <div class="">
                                <div class="tw-p-3">
                                    <input
                                        autocomplete="new-password"
                                        class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-px-3 tw-py-1 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
                                        placeholder={$navChat === "users"
                                            ? $LL.chat.searchUser()
                                            : $LL.chat.searchChat()}
                                        on:keydown={handleKeyDown}
                                        on:keyup={() => handleKeyUp(userProviderMerger)}
                                        bind:value={$chatSearchBarValue}
                                    />
                                </div>
                            </div>
                        {/if}
                    {/await}
                    {#if searchLoader}
                        <ChatLoader label={$LL.chat.loader()} />
                    {/if}
                </div>
            </div>
            {#if $chatConnectionStatus === "CONNECTING" && $userIsConnected}
                <ChatLoader label={$LL.chat.connecting()} />
            {/if}
            {#if $chatConnectionStatus === "ON_ERROR" && $userIsConnected}
                <ChatError />
            {/if}

            {#if !$userIsConnected}
                <div class="tw-flex-col tw-items-center tw-justify-center tw-text-center tw-px-4 tw-py-12">
                    <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clip-path="url(#clip0_4453_23480)">
                            <path
                                d="M48 10.666C50.1217 10.666 52.1566 11.5089 53.6569 13.0092C55.1571 14.5095 56 16.5443 56 18.666V39.9993C56 42.1211 55.1571 44.1559 53.6569 45.6562C52.1566 47.1565 50.1217 47.9994 48 47.9994H34.6667L21.3333 55.9994V47.9994H16C13.8783 47.9994 11.8434 47.1565 10.3431 45.6562C8.84286 44.1559 8 42.1211 8 39.9993V18.666C8 16.5443 8.84286 14.5095 10.3431 13.0092C11.8434 11.5089 13.8783 10.666 16 10.666H48Z"
                                stroke="white"
                                stroke-width="2.66667"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M25.333 24H25.3597"
                                stroke="white"
                                stroke-width="2.66667"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M38.667 24H38.6937"
                                stroke="white"
                                stroke-width="2.66667"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                            <path
                                d="M25.333 34.666C26.202 35.5529 27.2393 36.2576 28.384 36.7386C29.5288 37.2196 30.758 37.4674 31.9997 37.4674C33.2414 37.4674 34.4706 37.2196 35.6153 36.7386C36.7601 36.2576 37.7973 35.5529 38.6663 34.666"
                                stroke="white"
                                stroke-width="2.66667"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </g>
                        <defs>
                            <clipPath id="clip0_4453_23480">
                                <rect width="64" height="64" fill="white" />
                            </clipPath>
                        </defs>
                    </svg>
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

            {#if $chatConnectionStatus === "ONLINE"}
                {#if $joignableRoom.length > 0 && $chatSearchBarValue.trim() !== ""}
                    <p class="tw-p-0 tw-m-0 tw-text-gray-400">{$LL.chat.availableRooms()}</p>
                    <div class="tw-flex tw-flex-col">
                        {#each $joignableRoom as room (room.id)}
                            <JoignableRooms {room} />
                        {/each}
                    </div>
                {/if}
                <button
                    class="tw-group tw-relative tw-m-0 tw-px-3 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-b-0 tw-border-white/10"
                    on:click={toggleDisplayRoomInvitations}
                >
                    <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                        {$LL.chat.invitations()}
                    </div>
                    <div class="tw-transition-all group-hover:tw-rotate-180">
                        {#if displayRoomInvitations}
                            <IconChevronUp />
                        {:else}
                            <IconChevronDown />
                        {/if}
                    </div>
                </button>
                {#if displayRoomInvitations}
                    <div class="tw-flex tw-flex-col tw-overflow-auto tw-pl-3 tw-pr-4 tw-pb-3">
                        <ShowMore items={filteredRoomInvitations} maxNumber={8} idKey="id" let:item={room}>
                            <RoomInvitation {room} />
                        </ShowMore>
                    </div>
                {/if}
                <div
                    class="tw-group tw-relative tw-px-3 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-b-0 tw-border-white/10"
                >
                    <button
                        class="tw-flex tw-items-center tw-space-x-2 tw-m-0 tw-p-0 tw-grow"
                        on:click={toggleDisplayDirectRooms}
                    >
                        <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                            {$LL.chat.people()}
                        </div>
                        <div class="tw-transition-all group-hover:tw-rotate-180">
                            {#if displayDirectRooms}
                                <IconChevronUp />
                            {:else}
                                <IconChevronDown />
                            {/if}
                        </div>
                    </button>
                </div>

                {#if displayDirectRooms}
                    <div class="tw-flex tw-flex-col tw-overflow-auto tw-px-2 tw-pb-2">
                        <ShowMore items={filteredDirectRoom} maxNumber={8} idKey="id" let:item={room}>
                            <Room {room} />
                        </ShowMore>
                    </div>
                {/if}

                <div
                    class="tw-group tw-relative tw-px-3 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-b-0 tw-border-white/10"
                >
                    <button
                        class="tw-flex tw-items-center tw-space-x-2 tw-grow tw-m-0 tw-p-0"
                        on:click={toggleDisplayRooms}
                    >
                        <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                            {$LL.chat.rooms()}
                        </div>
                    </button>
                    {#if $isGuest === false}
                        <CreateRoomOrFolderOption />
                    {/if}
                    <div class="tw-transition-all group-hover:tw-rotate-180">
                        {#if displayRooms}
                            <IconChevronUp />
                        {:else}
                            <IconChevronDown />
                        {/if}
                    </div>
                </div>
                {#if displayRooms}
                    <div class="tw-px-2 tw-pb-2">
                        <ShowMore items={filteredRooms} maxNumber={8} idKey="id" let:item={room}>
                            <Room {room} />
                        </ShowMore>
                    </div>
                {/if}
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

            <div
                class="tw-group tw-relative tw-px-3 tw-rounded-none tw-text-white/75 hover:tw-text-white tw-h-11 hover:tw-bg-contrast-200/10 tw-w-full tw-flex tw-space-x-2 tw-items-center tw-border tw-border-solid tw-border-x-0 tw-border-t tw-border-white/10"
            >
                <button
                    class="tw-flex tw-items-center tw-space-x-2 tw-grow tw-m-0 tw-p-0"
                    on:click={toggleDisplayProximityChat}
                >
                    <div class="tw-text-sm tw-font-bold tw-tracking-widest tw-uppercase tw-grow tw-text-left">
                        {$LL.chat.proximity()}
                    </div>
                    <div class="tw-transition-all group-hover:tw-rotate-90">
                        <IconChevronRight />
                    </div>
                </button>
            </div>
            <div class="tw-absolute tw-bottom-0 tw-w-full">
                {#if $isEncryptionRequiredAndNotSet === true && $isGuest === false}
                    <button
                        data-testid="restoreEncryptionButton"
                        on:click|stopPropagation={initChatConnectionEncryption}
                        class="tw-text-white tw-flex tw-gap-2 tw-justify-center tw-w-full tw-bg-neutral tw-m-0 tw-rounded-none tw-py-2 tw-px-3"
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g clip-path="url(#clip0_4440_9037)">
                                <path
                                    d="M19 17.9994C19.9283 17.9994 20.8185 17.6307 21.4749 16.9743C22.1313 16.3179 22.5 15.4277 22.5 14.4994C22.5 13.5712 22.1313 12.6809 21.4749 12.0246C20.8185 11.3682 19.9283 10.9994 19 10.9994H18C18.397 9.23143 17.715 7.40643 16.212 6.21243C14.709 5.01943 12.612 4.63743 10.712 5.21243C8.81201 5.78743 7.39701 7.23143 7.00001 8.99943C4.80101 8.91143 2.84501 10.3254 2.33401 12.3724C1.82201 14.4194 2.89801 16.5264 4.90001 17.3994"
                                    stroke="white"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M8 16C8 15.7348 8.10536 15.4804 8.29289 15.2929C8.48043 15.1054 8.73478 15 9 15H15C15.2652 15 15.5196 15.1054 15.7071 15.2929C15.8946 15.4804 16 15.7348 16 16V19C16 19.2652 15.8946 19.5196 15.7071 19.7071C15.5196 19.8946 15.2652 20 15 20H9C8.73478 20 8.48043 19.8946 8.29289 19.7071C8.10536 19.5196 8 19.2652 8 19V16Z"
                                    stroke="white"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                                <path
                                    d="M10 15V13C10 12.4696 10.2107 11.9609 10.5858 11.5858C10.9609 11.2107 11.4696 11 12 11C12.5304 11 13.0391 11.2107 13.4142 11.5858C13.7893 11.9609 14 12.4696 14 13V15"
                                    stroke="white"
                                    stroke-width="1.5"
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                />
                            </g>
                            <defs>
                                <clipPath id="clip0_4440_9037">
                                    <rect width="24" height="24" fill="white" />
                                </clipPath>
                            </defs>
                        </svg>
                        <div class="tw-text-sm tw-font-bold tw-grow tw-text-left">
                            {$LL.chat.e2ee.encryptionNotConfigured()}
                        </div>
                        <div
                            class="tw-text-xs tw-rounded tw-border tw-border-solid tw-border-white tw-py-0.5 tw-px-1.5 group-hover:tw-bg-white/10"
                        >
                            Configurer <!-- TODO HUGO -->
                        </div>
                    </button>
                {/if}
            </div>
        </div>
    {/if}
    {#if $selectedRoom !== undefined}
        <RoomTimeline room={$selectedRoom} />
    {:else if $selectedRoom === undefined && sideBarWidth >= CHAT_LAYOUT_LIMIT}
        <div class="tw-flex tw-flex-col tw-flex-1 tw-pl-4">
            <p class="tw-self-center tw-text-md tw-text-gray-500">{$LL.chat.nothingToDisplay()}</p>
        </div>
    {/if}
</div>
