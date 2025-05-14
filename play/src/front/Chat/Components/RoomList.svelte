<script lang="ts">
    import { get } from "svelte/store";

    import { onDestroy, onMount } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import LL from "../../../i18n/i18n-svelte";
    import { chatSearchBarValue, joignableRoom, navChat } from "../Stores/ChatStore";
    import { selectedRoomStore } from "../Stores/SelectRoomStore";
    import { ChatRoom } from "../Connection/ChatConnection";
    import { INITIAL_SIDEBAR_WIDTH, loginTokenErrorStore } from "../../Stores/ChatStore";
    import { userIsConnected } from "../../Stores/MenuStore";
    import WokaFromUserId from "../../Components/Woka/WokaFromUserId.svelte";
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
    import { IconChevronUp, IconCloudLock, IconRefresh } from "@wa-icons";

    export let sideBarWidth: number = INITIAL_SIDEBAR_WIDTH;

    const proximityChatRoom = gameManager.getCurrentGameScene().proximityChatRoom;
    const chat = gameManager.chatConnection;
    const shouldRetrySendingEvents = chat.shouldRetrySendingEvents;

    const chatConnectionStatus = chat.connectionStatus;
    const CHAT_LAYOUT_LIMIT = INITIAL_SIDEBAR_WIDTH * 2;

    let directRooms = chat.directRooms;
    let rooms = chat.rooms;
    //TODO : Make a distinction between invitations to a room or a space;
    let roomInvitations = chat.invitations;
    let roomFolders = chat.folders;
    let proximityHasUnreadMessages = proximityChatRoom.hasUnreadMessages;

    let displayDirectRooms = false;
    let displayRooms = false;
    let displayRoomInvitations = false;

    //let proximityChatRoomHasUserInProximityChatSubscribtion: Unsubscriber | undefined;
    //let _hasUserInProximityChat = false;
    //let proximityChatRoomHasUnreadMessagesSubscribtion: Unsubscriber | undefined;
    //let _hasUnreadMessages = false;

    onMount(() => {
        expandOrCollapseRoomsIfEmpty();
        /*proximityChatRoomHasUserInProximityChatSubscribtion = proximityChatRoom.hasUserInProximityChat.subscribe(
            (hasUserInProximityChat) => {
                _hasUserInProximityChat = hasUserInProximityChat;
            }
        );
        proximityChatRoomHasUnreadMessagesSubscribtion = proximityChatRoom.hasUnreadMessages.subscribe(
            (hasUnreadMessages) => {
                _hasUnreadMessages = hasUnreadMessages;
            }
        );*/
    });

    const directRoomsUnsubscriber = rooms.subscribe((rooms) => openRoomsIfCollapsedBeforeNewRoom(rooms));
    const roomInvitationsUnsubscriber = roomInvitations.subscribe((roomInvitations) =>
        openRoomInvitationsIfCollapsedBeforeNewRoom(roomInvitations)
    );

    onDestroy(() => {
        directRoomsUnsubscriber();
        roomInvitationsUnsubscriber();
        //if (proximityChatRoomHasUserInProximityChatSubscribtion) proximityChatRoomHasUserInProximityChatSubscribtion();
        //if (proximityChatRoomHasUnreadMessagesSubscribtion) proximityChatRoomHasUnreadMessagesSubscribtion();
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
</script>

<div
    class="overflow-auto h-full grid grid-rows-[1fr_auto] {sideBarWidth > INITIAL_SIDEBAR_WIDTH * 2 &&
    $navChat.key === 'chat'
        ? 'grid-cols-[auto_1fr]'
        : 'grid-cols-[1fr]'}"
>
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
                class="relative pt-16 {$isEncryptionRequiredAndNotSet === true && $isGuest === false
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
                        <span slot="emoji">
                            <IconRefresh font-size="50" />
                        </span>
                        <span slot="title">
                            {$LL.chat.loginTokenError()}
                        </span>
                        <span slot="button-label">
                            {$LL.chat.reconnect()}
                        </span>
                    </RequireConnection>
                {/if}

                <div class="px-2 py-3 border border-solid border-x-0 border-t border-y-0 border-b-0 border-white/10">
                    <div
                        class="group relative px-3 rounded h-11 w-full flex space-x-2 items-center {$proximityHasUnreadMessages
                            ? 'hover:bg-contrast-200/20 bg-contrast-200/10'
                            : 'hover:bg-contrast-200/10'}"
                    >
                        <button
                            class="flex items-center space-x-2 grow m-0 p-0"
                            on:click={toggleDisplayProximityChat}
                            data-testid="toggleDisplayProximityChat"
                        >
                            <div class="relative">
                                <div
                                    class="rounded-full bg-white/10 h-7 w-7 border border-solid text-white flex items-center justify-center p-[1px] relative {$proximityHasUnreadMessages
                                        ? 'border-white'
                                        : 'border-white/70'}"
                                >
                                    <div class="absolute overflow-hidden w-full h-full rounded-full">
                                        <div
                                            class=" flex items-center justify-center translate-y-[3px]  group-hover:translate-y-[0] transition-all"
                                        >
                                            <WokaFromUserId userId={-1} customWidth="32px" placeholderSrc="" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div
                                class="cursor-default text-sm grow text-start ps-1 {$proximityHasUnreadMessages
                                    ? 'text-white font-bold'
                                    : 'text-white/75'}"
                            >
                                {$LL.chat.proximity()}
                            </div>
                            {#if $proximityHasUnreadMessages}
                                <div class="flex items-center justify-center h-7 w-7 relative">
                                    <div class="rounded-full bg-secondary-200 h-2 w-2 animate-ping absolute" />
                                    <div class="rounded-full bg-secondary-200 h-1.5 w-1.5 absolute" />
                                </div>
                            {/if}
                        </button>
                    </div>
                </div>
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
                            on:click={toggleDisplayRoomInvitations}
                        >
                            <div class="text-sm font-bold tracking-widest uppercase grow text-start">
                                {$LL.chat.invitations()}
                            </div>
                            <button
                                class="transition-all group-hover:bg-white/10 p-1 rounded-lg aspect-square flex items-center justify-center text-white"
                            >
                                <IconChevronUp
                                    class={`transform transition ${!displayRoomInvitations ? "" : "rotate-180"}`}
                                />
                            </button>
                        </button>
                        {#if displayRoomInvitations}
                            <div class="flex flex-col overflow-auto ps-3 pr-4 pb-3">
                                <ShowMore items={filteredRoomInvitations} maxNumber={8} idKey="id" let:item={room}>
                                    <RoomInvitation {room} />
                                </ShowMore>
                            </div>
                        {/if}
                    {/if}

                    <button
                        class="group relative px-3 m-0 rounded-none text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center border border-solid border-x-0 border-t border-b-0 border-white/10"
                        on:click={toggleDisplayDirectRooms}
                    >
                        <div class="flex items-center space-x-2 m-0 p-0 grow">
                            <div class="text-sm font-bold tracking-widest uppercase grow text-start">
                                {$LL.chat.people()}
                            </div>
                            <button
                                class="transition-all group-hover:bg-white/10 p-1 rounded-lg aspect-square flex items-center justify-center text-white"
                            >
                                <IconChevronUp
                                    class={`transform transition ${!displayDirectRooms ? "" : "rotate-180"}`}
                                />
                            </button>
                        </div>
                    </button>

                    {#if displayDirectRooms}
                        <div class="flex flex-col px-2 pb-2">
                            <ShowMore items={filteredDirectRoom} maxNumber={8} idKey="id" let:item={room}>
                                <Room {room} />
                            </ShowMore>
                        </div>
                    {/if}

                    <div class="flex items-center space-x-2 grow m-0 p-0">
                        <!-- TODO : use div instead of button to avoid focus issues try to find a better solution -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class="group relative px-3 m-0 mb-2 rounded-none text-white/75 hover:text-white h-11 hover:bg-contrast-200/10 w-full flex space-x-2 items-center border border-solid border-x-0 border-t border-b-0 border-white/10"
                            on:click={toggleDisplayRooms}
                            data-testid="roomAccordeon"
                        >
                            <div class="flex items-center space-x-2 grow m-0 p-0">
                                <div class="text-sm font-bold tracking-widest uppercase grow text-start">
                                    {$LL.chat.rooms()}
                                </div>
                            </div>
                            <CreateRoomOrFolderOption parentID={undefined} parentName="" folder={undefined} />
                            <button
                                class="transition-all group-hover:bg-white/10 p-1 rounded-lg aspect-square flex items-center justify-center text-white"
                            >
                                <IconChevronUp class={`transform transition ${!displayRooms ? "" : "rotate-180"}`} />
                            </button>
                        </div>
                    </div>
                    {#if displayRooms}
                        <div class="px-2 pb-2">
                            <ShowMore items={filteredRooms} maxNumber={8} idKey="id" let:item={room}>
                                <Room {room} />
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
        <div class="overflow-y-auto">
            <RoomTimeline room={$selectedRoomStore} />
        </div>
    {:else if $selectedRoomStore === undefined && sideBarWidth >= CHAT_LAYOUT_LIMIT}
        <div class="flex flex-col flex-1 ps-4 items-center pt-8">
            <div class="text-center px-3 max-w-md">
                <img src={getCloseImg} alt="Discussion bubble" />
                <div class="text-lg font-bold text-center">{$LL.chat.noRoomOpen()}</div>
                <div class="text-sm opacity-50 text-center">
                    {$LL.chat.noRoomOpenDescription()}
                </div>
            </div>
        </div>
    {/if}

    <div class="w-full flex flex-col col-span-2 h-fit">
        <ExternalComponents zone="chatBand" />
        {#if $isEncryptionRequiredAndNotSet === true && $isGuest === false}
            <div class="w-full">
                <button
                    data-testid="restoreEncryptionButton"
                    on:click|stopPropagation={initChatConnectionEncryption}
                    class="text-white flex gap-2 justify-center w-full bg-neutral  hover:bg-neutral-600 hover:brightness-100 m-0 rounded-none py-2 px-3 appearance-none"
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
