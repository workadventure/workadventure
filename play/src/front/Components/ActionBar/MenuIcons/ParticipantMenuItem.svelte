<script lang="ts">
    import { clickOutside } from "svelte-outside";
    import { getContext, setContext } from "svelte";
    import { derived, get, type Readable, type Unsubscriber } from "svelte/store";
    import { SvelteMap } from "svelte/reactivity";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { navChat } from "../../../Chat/Stores/ChatStore";
    import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";
    import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { gameSceneStore } from "../../../Stores/GameSceneStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { getColorByString } from "../../../Utils/ColorGenerator";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { inLivekitStore, isSpeakerStore, inBbbStore, inJitsiStore } from "../../../Stores/MediaStore";
    import { isInRemoteConversation } from "../../../Stores/StreamableCollectionStore";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import type { MeetingParticipant } from "../../../Stores/MeetingInvitationStore";
    import WokaFromUserId from "../../Woka/WokaFromUserId.svelte";
    import Spinner from "../../Icons/Spinner.svelte";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";
    import ParticipantWoka from "./ParticipantWoka.svelte";
    import {
        buildProximityParticipantView,
        type ProximityParticipantRoomSnapshot,
        type ProximityParticipantView,
    } from "./ParticipantMenuParticipants";
    import { IconChevronDown, IconMessageCircle2, IconUserPlus } from "@wa-icons";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    const inProfileMenu = getContext("profileMenu");

    interface Props {
        first?: boolean;
        classList?: string;
    }

    // Useless properties. They are here only because we set the "first" or "classList" prop on all the right menu items.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let { first = undefined, classList = undefined }: Props = $props();

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom-end",
        },
        8,
    );

    const participantMenuVisibleStore = derived(
        [inLivekitStore, isSpeakerStore, inBbbStore, inJitsiStore, isInRemoteConversation],
        ([inLivekitStore, isSpeakerStore, inBbbStore, inJitsiStore, isInRemoteConversation]) =>
            inLivekitStore || isSpeakerStore || inBbbStore || inJitsiStore || isInRemoteConversation,
    );

    function closeParticipantMenu() {
        openedMenuStore.close("participantMenu");
    }

    function onSendMessage() {
        if (get(chatVisibilityStore) && get(navChat).key === "chat") {
            chatVisibilityStore.set(false);
            closeParticipantMenu();
            return;
        }
        const gameScene = gameManager.getCurrentGameScene();
        const proximityChatRoom = gameScene.proximityChatRoomManager.resolveTargetRoom();
        if (!proximityChatRoom) {
            return;
        }
        selectedRoomStore.set(proximityChatRoom);
        navChat.switchToChat();
        chatVisibilityStore.set(true);
        proximityChatRoom.hasUnreadMessages.set(false);
        proximityChatRoom.unreadMessagesCount.set(0);
        chatNotificationStore.clearRoom(proximityChatRoom.id);
        proximityChatRoom.unreadNotificationCount.set(0);
        analyticsClient.openedChat();
        closeParticipantMenu();
    }

    function onInviteUser() {
        if (get(chatVisibilityStore) && get(navChat).key === "users") {
            chatVisibilityStore.set(false);
            closeParticipantMenu();
            return;
        }
        const gameScene = gameManager.getCurrentGameScene();
        const proximityChatRoom = gameScene.proximityChatRoomManager.resolveTargetRoom();
        if (!proximityChatRoom) {
            return;
        }
        selectedRoomStore.set(proximityChatRoom);
        navChat.switchToUserList();
        chatVisibilityStore.set(true);
        analyticsClient.openUserList();
        closeParticipantMenu();
    }

    /** Opens the WokaMenu for a participant, same as clicking their avatar in the game. */
    function openParticipantWokaMenu(participant: MeetingParticipant) {
        const gameScene = gameManager.getCurrentGameScene();
        if (!gameScene) return;
        const mapPlayers = get(gameScene.MapPlayersByKey);
        const remotePlayer = [...mapPlayers].find(([, player]) => player.userUuid === participant.uuid)?.[1];
        if (remotePlayer) {
            remotePlayer.activate();
            closeParticipantMenu();
        }
    }

    const emptyParticipantView: ProximityParticipantView = {
        participantGroups: [],
        uniqueParticipants: [],
    };

    /** Participants grouped by joined proximity room. The compact stack uses uniqueParticipants. */
    const participantView: Readable<ProximityParticipantView> = derived(
        [participantMenuVisibleStore, gameSceneStore],
        ([visible, scene], set) => {
            if (!visible || !scene?.proximityChatRoomManager) {
                set(emptyParticipantView);
                return;
            }

            const roomStates = new SvelteMap<string, ProximityParticipantRoomSnapshot>();
            let roomUnsubscribers: Unsubscriber[] = [];

            const clearRoomSubscriptions = () => {
                for (const unsubscribe of roomUnsubscribers) {
                    unsubscribe();
                }
                roomUnsubscribers = [];
            };

            const updateView = () => {
                const localUuid = localUserStore.getLocalUser()?.uuid ?? "";
                set(buildProximityParticipantView(Array.from(roomStates.values()), localUuid));
            };

            const roomsUnsubscriber = scene.proximityChatRoomManager.roomsStore.subscribe((rooms) => {
                clearRoomSubscriptions();
                roomStates.clear();

                for (const room of rooms) {
                    roomStates.set(room.id, {
                        id: room.id,
                        name: get(room.name),
                        isJoined: get(room.isJoined),
                        participants: get(room.currentMeetingParticipantsStore),
                    });

                    roomUnsubscribers.push(
                        room.name.subscribe((name) => {
                            const state = roomStates.get(room.id);
                            if (!state) return;
                            state.name = name;
                            updateView();
                        }),
                        room.isJoined.subscribe((isJoined) => {
                            const state = roomStates.get(room.id);
                            if (!state) return;
                            state.isJoined = isJoined;
                            updateView();
                        }),
                        room.currentMeetingParticipantsStore.subscribe((participants) => {
                            const state = roomStates.get(room.id);
                            if (!state) return;
                            state.participants = participants;
                            updateView();
                        }),
                    );
                }

                updateView();
            });

            return () => {
                roomsUnsubscriber();
                clearRoomSubscriptions();
            };
        },
    );

    const PARTICIPANT_ROW_HEIGHT_PX = 44;
    const PARTICIPANT_GROUP_HEADER_HEIGHT_PX = 24;
    /** Max list height: never exceed 100vh - 260px nor this cap (e.g. ~8 visible rows). */
    const PARTICIPANT_LIST_MAX_HEIGHT_PX = 400;

    /** List viewport height: (row height × count), capped at max (400px and viewport - 260px). */
    let participantsListHeightPx = $derived.by(() => {
        const participantCount = $participantView.participantGroups.reduce(
            (total, group) => total + group.participants.length,
            0,
        );
        const contentH =
            participantCount * PARTICIPANT_ROW_HEIGHT_PX +
            $participantView.participantGroups.length * PARTICIPANT_GROUP_HEADER_HEIGHT_PX;
        const maxVh =
            typeof window !== "undefined" ? Math.max(PARTICIPANT_ROW_HEIGHT_PX, window.innerHeight - 260) : 400;
        return Math.min(contentH, PARTICIPANT_LIST_MAX_HEIGHT_PX, maxVh);
    });

    /** True when menu is visible but game scene / proximityChatRoomManager is not ready yet. */
    let loading = $derived($participantMenuVisibleStore && !$gameSceneStore?.proximityChatRoomManager);
    let localParticipantName = $derived(localUserStore.getName()?.trim() || $LL.camera.my.nameTag());
</script>

{#if $participantMenuVisibleStore}
    {#if !inProfileMenu}
        <!-- svelte-ignore a11y_click_events_have_key_events -->
        <!-- svelte-ignore a11y_no_static_element_interactions -->
        <div
            data-testid="participant-menu"
            class="items-center relative cursor-pointer pointer-events-auto ps-2 pe-2"
            use:floatingUiRef
            onclick={(event) => {
                event.preventDefault();
                openedMenuStore.toggle("participantMenu");
            }}
        >
            <div class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2">
                <div
                    class="flex items-center h-full group-hover:bg-white/10 group-hover:rounded pl-4 pr-4 gap-2 hover:bg-white/10"
                >
                    <div class="participant-stack flex items-center flex-shrink-0 -space-x-4" aria-hidden="true">
                        <div
                            class="participant-avatar w-9 h-9 rounded-full overflow-hidden flex items-center justify-center"
                            style="z-index: {$participantView.uniqueParticipants.length + 1};"
                            style:background-color={getColorByString(localParticipantName)}
                            title={$LL.camera.my.nameTag()}
                        >
                            <WokaFromUserId userId={-1} placeholderSrc="" customWidth="36px" />
                        </div>
                        {#if loading}
                            <div
                                class="participant-avatar w-9 h-9 flex items-center justify-center flex-shrink-0"
                                aria-hidden="true"
                            >
                                <Spinner size="sm" fillColor="fill-white" />
                            </div>
                        {/if}
                        {#if $participantView.uniqueParticipants.length > 0}
                            {@const slicedParticipants = $participantView.uniqueParticipants.slice(0, 2)}
                            {#each slicedParticipants as participant, i (participant.uuid || participant.spaceUserId)}
                                <div
                                    class="participant-avatar w-9 h-9"
                                    style={`z-index: ${slicedParticipants.length - i};`}
                                    title={participant.name}
                                >
                                    <ParticipantWoka
                                        pictureStore={participant.pictureStore}
                                        fallbackName={participant.name}
                                    />
                                </div>
                            {/each}
                            {#if $participantView.uniqueParticipants.length > 2}
                                <div
                                    class="participant-avatar participant-plus !-ml-[13px] w-8 h-8 rounded-full bg-contrast/50 backdrop-blur-sm border-2 border-contrast/80 flex items-center justify-center flex-shrink-0 ring-2 ring-contrast/80 text-white text-sm font-bold z-0"
                                    style="animation-delay: {($participantView.uniqueParticipants.length + 1) * 120}ms"
                                    title={$LL.actionbar.participantListPlaceholder()}
                                >
                                    +{$participantView.uniqueParticipants.length - 2}
                                </div>
                            {/if}
                        {/if}
                    </div>

                    <IconChevronDown
                        stroke="2"
                        class="h-4 w-4 aspect-square transition-all opacity-50 flex-shrink-0 {$openedMenuStore ===
                        'participantMenu'
                            ? 'rotate-180'
                            : ''}"
                        height="16px"
                        width="16px"
                    />
                </div>
            </div>
        </div>
        {#if $openedMenuStore === "participantMenu"}
            <div
                class="absolute bg-contrast/80 backdrop-blur rounded-md w-48 text-white"
                data-testid="participant-sub-menu"
                use:floatingUiContent
                use:clickOutside={closeParticipantMenu}
            >
                <div use:arrowAction></div>
                <div class="p-1 m-0 max-h-[calc(100vh-96px)] overflow-y-auto flex flex-col items-stretch">
                    <div class="flex-shrink-0 px-2 py-1.5 text-xxs text-white/70 font-semibold uppercase tracking-wide">
                        {$LL.actionbar.participantListPlaceholder()}
                    </div>
                    <div
                        class="flex-shrink-0 flex items-center gap-3 py-1 px-1 rounded transition-colors cursor-default"
                        data-testid="participant-row-me"
                    >
                        <div
                            class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative"
                            style:background-color={getColorByString(localParticipantName)}
                            aria-hidden="true"
                        >
                            <span class="flex items-center justify-center w-full h-full">?</span>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <WokaFromUserId userId={-1} placeholderSrc="" customWidth="36px" />
                            </div>
                        </div>
                        <div class="min-w-0 flex-1 overflow-hidden">
                            <div class="font-medium text-white text-sm truncate" title={$LL.camera.my.nameTag()}>
                                {$LL.camera.my.nameTag()}
                            </div>
                        </div>
                    </div>
                    {#if $participantView.participantGroups.length > 0}
                        <div
                            class="participant-list-viewport flex-shrink-0 overflow-y-auto w-full"
                            style="height: {participantsListHeightPx}px;"
                        >
                            {#each $participantView.participantGroups as group (group.id)}
                                <div
                                    class="px-1 pt-2 pb-0.5 text-xxs uppercase text-white/50 font-semibold truncate"
                                    data-testid="participant-group-header"
                                    title={group.name}
                                >
                                    {group.name}
                                </div>
                                {#each group.participants as item (group.id + ":" + item.spaceUserId)}
                                    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                                    <div
                                        class="flex items-center gap-3 py-1 px-1 rounded hover:bg-white/10 transition-colors pointer-events-auto cursor-pointer"
                                        data-testid="participant-row"
                                        role="button"
                                        tabindex="0"
                                        onclick={() => openParticipantWokaMenu(item)}
                                        onkeydown={(e) =>
                                            (e.key === "Enter" || e.key === " ") &&
                                            (e.preventDefault(), openParticipantWokaMenu(item))}
                                    >
                                        <div
                                            class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative"
                                            aria-hidden="true"
                                        >
                                            <ParticipantWoka
                                                pictureStore={item.pictureStore}
                                                fallbackName={item.name}
                                            />
                                        </div>
                                        <div class="min-w-0 flex-1 overflow-hidden">
                                            <div class="font-medium text-white text-sm truncate" title={item.name}>
                                                {item.name}
                                            </div>
                                            {#if item.uuid?.includes("@")}
                                                <div class="text-xxs text-white/70 truncate" title={item.uuid}>
                                                    {item.uuid}
                                                </div>
                                            {/if}
                                        </div>
                                    </div>
                                {/each}
                            {/each}
                        </div>
                    {/if}
                    <div class="flex-shrink-0 border-t border-white/20 mt-1 pt-1 flex flex-col gap-0.5">
                        <ActionBarButton
                            label={$LL.actionbar.participantSendMessage()}
                            onclick={onSendMessage}
                            dataTestId="participant-send-message"
                        >
                            <IconMessageCircle2 font-size="20" />
                        </ActionBarButton>
                        <ActionBarButton
                            label={$LL.actionbar.participantInviteUser()}
                            onclick={onInviteUser}
                            dataTestId="participant-invite-user"
                        >
                            <IconUserPlus font-size="20" />
                        </ActionBarButton>
                    </div>
                </div>
            </div>
        {/if}
    {:else}
        <HeaderMenuItem label={$LL.actionbar.participantListPlaceholder()} />
        <div
            class="flex items-center gap-3 py-1 px-1 rounded transition-colors cursor-default"
            data-testid="participant-row-me"
        >
            <div
                class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative"
                style:background-color={getColorByString(localParticipantName)}
                aria-hidden="true"
            >
                <span class="flex items-center justify-center w-full h-full">?</span>
                <div class="absolute inset-0 flex items-center justify-center">
                    <WokaFromUserId userId={-1} placeholderSrc="" customWidth="36px" />
                </div>
            </div>
            <div class="min-w-0 flex-1">
                <div class="font-medium text-white text-sm truncate">
                    {$LL.camera.my.nameTag()}
                </div>
            </div>
        </div>
        {#if $participantView.participantGroups.length > 0}
            <div
                class="participant-list-viewport flex-shrink-0 overflow-y-auto"
                style="height: {participantsListHeightPx}px;"
            >
                {#each $participantView.participantGroups as group (group.id)}
                    <div
                        class="px-1 pt-2 pb-0.5 text-xxs uppercase text-white/50 font-semibold truncate"
                        data-testid="participant-group-header"
                        title={group.name}
                    >
                        {group.name}
                    </div>
                    {#each group.participants as item (group.id + ":" + item.spaceUserId)}
                        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
                        <div
                            class="flex items-center gap-3 py-1 px-1 rounded hover:bg-white/10 transition-colors pointer-events-auto cursor-pointer"
                            data-testid="participant-row"
                            role="button"
                            tabindex="0"
                            onclick={() => openParticipantWokaMenu(item)}
                            onkeydown={(e) =>
                                (e.key === "Enter" || e.key === " ") &&
                                (e.preventDefault(), openParticipantWokaMenu(item))}
                        >
                            <div
                                class="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative"
                                aria-hidden="true"
                            >
                                <div class="absolute inset-0 flex items-center justify-center">
                                    <ParticipantWoka pictureStore={item.pictureStore} fallbackName={item.name} />
                                </div>
                            </div>
                            <div class="min-w-0 flex-1">
                                <div class="font-medium text-white text-sm truncate">
                                    {item.name}
                                </div>
                                {#if item.uuid?.includes("@")}
                                    <div class="text-xxs text-white/70 truncate" title={item.uuid}>
                                        {item.uuid}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/each}
                {/each}
            </div>
        {/if}
        <ActionBarButton
            label={$LL.actionbar.participantSendMessage()}
            onclick={onSendMessage}
            dataTestId="participant-send-message"
        >
            <IconMessageCircle2 font-size="20" />
        </ActionBarButton>
        <ActionBarButton
            label={$LL.actionbar.participantInviteUser()}
            onclick={onInviteUser}
            dataTestId="participant-invite-user"
        >
            <IconUserPlus font-size="20" />
        </ActionBarButton>
    {/if}
{/if}

<style lang="scss">
    @keyframes participant-avatar-float {
        0%,
        100% {
            transform: translateY(0) scale(1);
            box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.15);
        }
        50% {
            transform: translateY(-3px) scale(1.05);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        }
    }

    .participant-stack {
        transition: transform 0.2s ease;
    }

    .participant-plus {
        animation-duration: 2.2s;
    }
</style>
