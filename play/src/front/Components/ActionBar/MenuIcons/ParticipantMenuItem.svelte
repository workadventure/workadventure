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
    import { IconChevronDown, IconMessageCircle2, IconUserPlus, IconUsersGroup } from "@wa-icons";

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
    $: participants = (participantsStore ? $participantsStore : []) as MeetingParticipant[];

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
                    class="flex items-center h-full group-hover:bg-white/10mr group-hover:rounded pl-4 pr-4 gap-2 hover:bg-white/10"
                >
                    <IconUsersGroup font-size="20" class="text-white" />
                    <div class="pr">
                        <div
                            class="font-bold text-white leading-3 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base"
                        >
                            {$LL.actionbar.participant()}
                        </div>
                    </div>

                    <IconChevronDown
                        stroke={2}
                        class="h-4 w-4 aspect-square transition-all opacity-50 {$openedMenuStore === 'participantMenu'
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
                    {#each participants as participant (participant.spaceUserId)}
                        <div
                            class="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/10 transition-colors cursor-default"
                            data-testid="participant-row"
                        >
                            <div
                                class="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm"
                                aria-hidden="true"
                            >
                                {getInitial(participant.name)}
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
        <HeaderMenuItem label={$LL.actionbar.participant()} />
        <div class="px-2 py-1.5 text-xxs text-white/70 font-semibold uppercase tracking-wide">
            {$LL.actionbar.participantListPlaceholder()}
        </div>
        {#each participants as participant (participant.spaceUserId)}
            <div
                class="flex items-center gap-3 py-2 px-2 rounded hover:bg-white/10 transition-colors cursor-default"
                data-testid="participant-row"
            >
                <div
                    class="flex-shrink-0 w-9 h-9 rounded-full bg-white/20 flex items-center justify-center text-white font-semibold text-sm"
                    aria-hidden="true"
                >
                    {getInitial(participant.name)}
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
