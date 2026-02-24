<script lang="ts">
    import { clickOutside } from "svelte-outside";
    import { getContext, setContext } from "svelte";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { chatVisibilityStore } from "../../../Stores/ChatStore";
    import { navChat } from "../../../Chat/Stores/ChatStore";
    import { selectedRoomStore } from "../../../Chat/Stores/SelectRoomStore";
    import { chatNotificationStore } from "../../../Stores/ProximityNotificationStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { inLivekitStore, isSpeakerStore, inBbbStore, inJitsiStore } from "../../../Stores/MediaStore";
    import { isInRemoteConversation } from "../../../Stores/StreamableCollectionStore";
    import type { MeetingParticipant } from "../../../Stores/MeetingInvitationStore";
    import HeaderMenuItem from "./HeaderMenuItem.svelte";
    import { IconChevronDown, IconMessageCircle2, IconUserPlus } from "@wa-icons";
    import WokaFromUserId from "../../Woka/WokaFromUserId.svelte";
    import { localUserStore } from "../../../Connection/LocalUserStore";

    // The ActionBarButton component is displayed differently in the menu.
    // We use the context to decide how to render it.
    setContext("inMenu", true);

    const inProfileMenu = getContext("profileMenu");

    // Useless properties. They are here only to avoid a warning because we set the "first" or "classList" prop on all the right menu items
    // svelte-ignore unused-export-let
    export let first: boolean | undefined = undefined;
    // svelte-ignore unused-export-let
    export let classList: string | undefined = undefined;

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom-end",
        },
        8
    );

    $: participantMenuVisibleStore =
        $inLivekitStore || $isSpeakerStore || $inBbbStore || $inJitsiStore || $isInRemoteConversation;

    function closeParticipantMenu() {
        openedMenuStore.close("participantMenu");
    }

    // Participants du meeting/space actuel (bulle, salle de réunion, etc.).
    // Must depend on participantMenuVisibleStore so the reactive statement is valid (svelte/no-immutable-reactive-statements).
    $: participantsStore = participantMenuVisibleStore
        ? gameManager.getCurrentGameScene?.()?.proximityChatRoom?.currentMeetingParticipantsStore
        : undefined;

    // Stacked avatars for trigger: me + up to 2 participants, then "+N" if more than 3 total
    $: totalParticipantCount = 1 + ($participantsStore?.length ?? 0);
    $: showPlusBadge = totalParticipantCount > 3;
    $: plusBadgeCount = totalParticipantCount - 3;

    $: stackedParticipants = $participantsStore?.filter((participant) => participant.uuid !== (localUserStore.getLocalUser()?.uuid ?? ""));
    $: stackedParticipantsBadge = stackedParticipants?.slice(0, 2);

    function getInitial(name: string): string {
        return name.trim().charAt(0).toUpperCase() || "?";
    }

    function onSendMessage() {
        const gameScene = gameManager.getCurrentGameScene();
        const proximityChatRoom = gameScene.proximityChatRoom;
        selectedRoomStore.set(proximityChatRoom);
        navChat.switchToChat();
        chatVisibilityStore.set(true);
        proximityChatRoom.hasUnreadMessages.set(false);
        proximityChatRoom.unreadMessagesCount.set(0);
        chatNotificationStore.clearAll();
        proximityChatRoom.unreadNotificationCount.set(0);
        analyticsClient.openedChat();
        closeParticipantMenu();
    }

    function onInviteUser() {
        const gameScene = gameManager.getCurrentGameScene();
        const proximityChatRoom = gameScene.proximityChatRoom;
        selectedRoomStore.set(proximityChatRoom);
        navChat.switchToUserList();
        chatVisibilityStore.set(true);
        analyticsClient.openUserList();
        closeParticipantMenu();
    }

    /** Opens the WokaMenu for a participant, same as clicking their avatar in the game. */
    function openParticipantWokaMenu(participant: MeetingParticipant) {
        const gameScene = gameManager.getCurrentGameScene();
        if (!gameScene?.MapPlayersByKey) return;
        const remotePlayer = [...gameScene.MapPlayersByKey].find(
            ([, player]) => player.userUuid === participant.uuid
        )?.[1];
        if (remotePlayer) {
            remotePlayer.activate();
            closeParticipantMenu();
        }
    }
</script>

{#if participantMenuVisibleStore}
    {#if !inProfileMenu}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            data-testid="participant-menu"
            class="items-center relative cursor-pointer pointer-events-auto ps-2 pe-2"
            use:floatingUiRef
            on:click|preventDefault={() => {
                openedMenuStore.toggle("participantMenu");
            }}
        >
            <div class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2">
                <div
                    class="flex items-center h-full group-hover:bg-white/10 group-hover:rounded pl-4 pr-4 gap-2 hover:bg-white/10"
                >
                    <div class="participant-stack flex items-center flex-shrink-0 -space-x-4" aria-hidden="true">
                        <div
                            class="participant-avatar w-9 h-9"
                            style="animation-delay: 0ms"
                            title={$LL.camera.my.nameTag()}
                        >
                            <WokaFromUserId userId={-1} placeholderSrc="" customWidth="40px" />
                        </div>
                        {#if stackedParticipantsBadge}
                            {#each stackedParticipantsBadge as participant, i (participant.spaceUserId)}
                                <div
                                    class="participant-avatar w-9 h-9"
                                    style="animation-delay: {(i + 1) * 120}ms"
                                    title={participant.name}
                                >
                                    <WokaFromUserId
                                        userId={participant.uuid ?? ""}
                                        placeholderSrc=""
                                        customWidth="40px"
                                    />
                                </div>
                            {/each}
                        {/if}
                        {#if showPlusBadge && stackedParticipants}
                            <div
                                class="participant-avatar participant-plus w-9 h-9 rounded-full bg-contrast/50 backdrop-blur-xl border-2 border-contrast/80 flex items-center justify-center flex-shrink-0 ring-2 ring-contrast/80 text-white text-sm font-bold"
                                style="animation-delay: {(stackedParticipants.length + 1) * 120}ms"
                                title="{$LL.actionbar.participantListPlaceholder()}"
                            >
                                +{plusBadgeCount}
                            </div>
                        {/if}
                    </div>

                    <IconChevronDown
                        stroke={2}
                        class="h-4 w-4 aspect-square transition-all opacity-50 flex-shrink-0 {$openedMenuStore === 'participantMenu'
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
                class="absolute bg-contrast/80 backdrop-blur rounded-md w-auto max-w-full text-white"
                data-testid="participant-sub-menu"
                use:floatingUiContent
                use:clickOutside={closeParticipantMenu}
            >
                <div use:arrowAction />
                <div class="p-1 m-0">
                    <div class="px-2 py-1.5 text-xxs text-white/70 font-semibold uppercase tracking-wide">
                        {$LL.actionbar.participantListPlaceholder()}
                    </div>
                    <div
                        class="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/10 transition-colors cursor-default"
                        data-testid="participant-row-me"
                    >
                        <div
                            class="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative"
                            aria-hidden="true"
                        >
                            <span class="flex items-center justify-center w-full h-full">?</span>
                            <div class="absolute inset-0 flex items-center justify-center">
                                <WokaFromUserId
                                    userId={-1}
                                    placeholderSrc=""
                                    customWidth="36px"
                                />
                            </div>
                        </div>
                        <div class="min-w-0 flex-1">
                            <div class="font-medium text-white text-sm truncate">
                                {$LL.camera.my.nameTag()}
                            </div>
                        </div>
                    </div>
                    {#if stackedParticipants}
                        {#each stackedParticipants as participant (participant.spaceUserId)}
                            <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                            <div
                                class="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
                                data-testid="participant-row"
                                role="button"
                                tabindex="0"
                                on:click={() => openParticipantWokaMenu(participant)}
                                on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openParticipantWokaMenu(participant))}
                            >
                                <div
                                    class="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative"
                                    aria-hidden="true"
                                >
                                    <span class="flex items-center justify-center w-full h-full">{getInitial(participant.name)}</span>
                                    <div class="absolute inset-0 flex items-center justify-center">
                                        <WokaFromUserId
                                            userId={participant.uuid ?? ""}
                                            placeholderSrc=""
                                            customWidth="36px"
                                        />
                                    </div>
                                </div>
                                <div class="min-w-0 flex-1">
                                    <div class="font-medium text-white text-sm truncate">
                                        {participant.name}
                                    </div>
                                    {#if participant.roomName}
                                        <div class="text-xxs text-white/70 truncate" title={participant.roomName}>
                                            {participant.roomName}
                                        </div>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    {/if}
                    <div class="border-t border-white/20 mt-1 pt-1 flex flex-col gap-0.5">
                        <ActionBarButton
                            label={$LL.actionbar.participantSendMessage()}
                            on:click={onSendMessage}
                            dataTestId="participant-send-message"
                        >
                            <IconMessageCircle2 font-size="20" />
                        </ActionBarButton>
                        <ActionBarButton
                            label={$LL.actionbar.participantInviteUser()}
                            on:click={onInviteUser}
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
        <div class="px-2 py-1.5 text-xxs text-white/70 font-semibold uppercase tracking-wide">
            {$LL.actionbar.participantListPlaceholder()}
        </div>
        <div
            class="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/10 transition-colors cursor-default"
            data-testid="participant-row-me"
        >
            <div
                class="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative"
                aria-hidden="true"
            >
                <span class="flex items-center justify-center w-full h-full">?</span>
                <div class="absolute inset-0 flex items-center justify-center">
                    <WokaFromUserId
                        userId={-1}
                        placeholderSrc=""
                        customWidth="36px"
                    />
                </div>
            </div>
            <div class="min-w-0 flex-1">
                <div class="font-medium text-white text-sm truncate">
                    {$LL.camera.my.nameTag()}
                </div>
            </div>
        </div>
        {#if stackedParticipants}
            {#each stackedParticipants as participant (participant.spaceUserId)}
                <!-- svelte-ignore a11y-click-events-have-key-events a11y-no-static-element-interactions -->
                <div
                    class="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/10 transition-colors cursor-pointer"
                    data-testid="participant-row"
                    role="button"
                    tabindex="0"
                    on:click={() => openParticipantWokaMenu(participant)}
                    on:keydown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openParticipantWokaMenu(participant))}
                >
                    <div
                        class="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm overflow-hidden relative"
                        aria-hidden="true"
                    >
                        <span class="flex items-center justify-center w-full h-full">{getInitial(participant.name)}</span>
                        <div class="absolute inset-0 flex items-center justify-center">
                            <WokaFromUserId
                                userId={participant.uuid ?? ""}
                                placeholderSrc=""
                                customWidth="36px"
                            />
                        </div>
                    </div>
                    <div class="min-w-0 flex-1">
                        <div class="font-medium text-white text-sm truncate">
                            {participant.name}
                        </div>
                        {#if participant.roomName}
                            <div class="text-xxs text-white/70 truncate" title={participant.roomName}>
                                {participant.roomName}
                            </div>
                        {/if}
                    </div>
                </div>
            {/each}
        {/if}
        <ActionBarButton
            label={$LL.actionbar.participantSendMessage()}
            on:click={onSendMessage}
            dataTestId="participant-send-message"
        >
            <IconMessageCircle2 font-size="20" />
        </ActionBarButton>
        <ActionBarButton
            label={$LL.actionbar.participantInviteUser()}
            on:click={onInviteUser}
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
