<script lang="ts">
    import { derived, get, Readable, writable } from "svelte/store";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { clickOutside } from "svelte-outside";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import {
        requestedCameraState,
        requestedMicrophoneState,
        silentStore,
        enableCameraSceneVisibilityStore,
        availabilityStatusStore,
    } from "../../Stores/MediaStore";
    import tooltipArrow from "../images/arrow-top.svg";

    import HelpTooltip from "../Tooltip/HelpTooltip.svelte";

    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { followRoleStore, followStateStore, followUsersStore } from "../../Stores/FollowStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { currentPlayerGroupLockStateStore } from "../../Stores/CurrentPlayerGroupStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { chatVisibilityStore, chatZoneLiveStore } from "../../Stores/ChatStore";
    import { navChat } from "../../Chat/Stores/ChatStore";
    import {
        inExternalServiceStore,
        myCameraStore,
        myMicrophoneStore,
        proximityMeetingStore,
    } from "../../Stores/MyMediaStore";
    import {
        activeSubMenuStore,
        addActionButtonActionBarEvent,
        addClassicButtonActionBarEvent,
        additionnalButtonsMenu,
        inviteUserActivated,
        menuVisiblilityStore,
        roomListActivated,
        SubMenusInterface,
        MenuKeys,
        subMenusStore,
        userIsConnected,
        screenSharingActivatedStore,
        backOfficeMenuVisibleStore,
        globalMessageVisibleStore,
        mapMenuVisibleStore,
        activeSecondaryZoneActionBarStore,
    } from "../../Stores/MenuStore";
    import { emoteMenuStore } from "../../Stores/EmoteStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { bottomActionBarVisibilityStore } from "../../Stores/BottomActionBarStore";
    import { isMediaBreakpointUp } from "../../Utils/BreakpointsUtils";
    import { mapEditorModeStore } from "../../Stores/MapEditorStore";
    import { iframeListener } from "../../Api/IframeListener";
    import { peerStore } from "../../Stores/PeerStore";
    import {
        modalIframeStore,
        modalVisibilityStore,
        roomListVisibilityStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../../Stores/ModalStore";
    import { isActivatedStore as isCalendarActivatedStore, isCalendarVisibleStore } from "../../Stores/CalendarStore";
    import { isActivatedStore as isTodoListActivatedStore, isTodoListVisibleStore } from "../../Stores/TodoListStore";
    import { externalActionBarSvelteComponent } from "../../Stores/Utils/externalSvelteComponentStore";
    import { ADMIN_BO_URL, ENABLE_OPENID } from "../../Enum/EnvironmentVariable";
    import Woka from "../Woka/WokaFromUserId.svelte";
    import Companion from "../Companion/Companion.svelte";
    import { loginSceneVisibleStore } from "../../Stores/LoginSceneStore";
    import { LoginScene, LoginSceneName } from "../../Phaser/Login/LoginScene";
    import { selectCharacterSceneVisibleStore } from "../../Stores/SelectCharacterStore";
    import { SelectCharacterScene, SelectCharacterSceneName } from "../../Phaser/Login/SelectCharacterScene";
    import { selectCompanionSceneVisibleStore } from "../../Stores/SelectCompanionStore";
    import { SelectCompanionScene, SelectCompanionSceneName } from "../../Phaser/Login/SelectCompanionScene";
    import { EnableCameraScene, EnableCameraSceneName } from "../../Phaser/Login/EnableCameraScene";
    import MessageCircleIcon from "../Icons/MessageCircleIcon.svelte";
    import UsersIcon from "../Icons/UsersIcon.svelte";
    import EmojiIcon from "../Icons/EmojiIcon.svelte";
    import CamOffIcon from "../Icons/CamOffIcon.svelte";
    import CamOnIcon from "../Icons/CamOnIcon.svelte";
    import FollowIcon from "../Icons/FollowIcon.svelte";
    import LockIcon from "../Icons/LockIcon.svelte";
    import LockOpenIcon from "../Icons/LockOpenIcon.svelte";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import MicOnIcon from "../Icons/MicOnIcon.svelte";
    import ScreenShareOffIcon from "../Icons/ScreenShareOffIcon.svelte";
    import ScreenShareIcon from "../Icons/ScreenShareIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import ProfilIcon from "../Icons/ProfilIcon.svelte";
    import AchievementIcon from "../Icons/AchievementIcon.svelte";
    import CamSettingsIcon from "../Icons/CamSettingsIcon.svelte";
    import SettingsIcon from "../Icons/SettingsIcon.svelte";
    import ChevronUpIcon from "../Icons/ChevronUpIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import MenuBurgerIcon from "../Icons/MenuBurgerIcon.svelte";
    import { focusMode, rightMode, hideMode, highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { connectionManager } from "../../Connection/ConnectionManager";

    import AppsIcon from "../Icons/AppsIcon.svelte";
    import { AddButtonActionBarEvent } from "../../Api/Events/Ui/ButtonActionBarEvent";
    import { getColorHexOfStatus, getStatusInformation, getStatusLabel } from "../../Utils/AvailabilityStatus";
    import { RequestedStatus } from "../../Rules/StatusRules/statusRules";
    import {
        audioManagerPlayerState,
        audioManagerRetryPlaySubject,
        audioManagerVisibilityStore,
    } from "../../Stores/AudioManagerStore";
    import AudioManager from "../AudioManager/AudioManager.svelte";
    import ActionBarIconButton from "./ActionBarIconButton.svelte";
    import MapSubMenu from "./MenuIcons/MapSubMenu.svelte";
    import ActionBarButtonWrapper from "./ActionBarButtonWrapper.svelte";
    import EmojiSubMenu from "./EmojiSubMenu.svelte";
    import MediaSettingsList from "./MediaSettingsList.svelte";
    import SilentBlock from "./SilentBlock.svelte";
    import AvailabilityStatusList from "./AvailabilityStatus/AvailabilityStatusList.svelte";
    import { IconArrowDown, IconCheckList, IconCalendar, IconLogout, IconMusic } from "@wa-icons";

    // gameManager.currenwStartedRoom?.miniLogo ?? WorkAdventureImg;
    let userName = gameManager.getPlayerName() || "";
    export const className = "";
    //let microphoneActive = false;
    let mediaSettingsDisplayed = false;
    let profileMenuIsDropped = false;
    let burgerOpen = false;
    let helpActive: string | undefined = undefined;
    let navigating = false;
    let camMenuIsDropped = false;
    let smallArrowVisible = true;
    let appMenuOpened = false;
    //const sound = new Audio("/resources/objects/webrtc-out-button.mp3");

    function focusModeOn() {
        focusMode.set(!get(focusMode));
    }

    function rightModeOn() {
        rightMode.set(!get(rightMode));
    }

    function lightModeOn() {
        focusMode.set(true);
    }

    function hideModeOn() {
        hideMode.set(!get(hideMode));
    }

    function microphoneClick(): void {
        if ($silentStore) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }

    function cameraClick(): void {
        if ($silentStore) return;
        if ($requestedCameraState === true) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    }

    function screenSharingClick(): void {
        if ($silentStore) return;
        if ($requestedScreenSharingState === true) {
            requestedScreenSharingState.disableScreenSharing();
        } else {
            requestedScreenSharingState.enableScreenSharing();
        }
    }

    // Still needed ?
    function switchLayoutMode() {
        // if ($embedScreenLayoutStore === LayoutMode.Presentation) {
        //     $embedScreenLayoutStore = LayoutMode.VideoChat;
        // } else {
        //     $embedScreenLayoutStore = LayoutMode.Presentation;
        // }
    }

    function followClick() {
        switch ($followStateStore) {
            case "off":
                gameManager.getCurrentGameScene().connection?.emitFollowRequest();
                followRoleStore.set("leader");
                followStateStore.set("active");
                break;
            case "requesting":
            case "active":
            case "ending":
                gameManager.getCurrentGameScene().connection?.emitFollowAbort();
                followUsersStore.stopFollowing();
                break;
        }
    }

    function lockClick() {
        gameManager.getCurrentGameScene().connection?.emitLockGroup(!$currentPlayerGroupLockStateStore);
    }

    function toggleChat() {
        if (!$chatVisibilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
        }

        chatVisibilityStore.set(!$chatVisibilityStore);
    }

    function toggleEmojiPicker() {
        if ($activeSecondaryZoneActionBarStore === "emote") {
            activeSecondaryZoneActionBarStore.set(undefined);
        } else {
            activeSecondaryZoneActionBarStore.set("emote");
            appMenuOpened = false;
        }
    }

    function close(): void {
        emoteMenuStore.closeEmoteMenu();
        activeSecondaryZoneActionBarStore.set(undefined);
    }

    function showMenuItem(key: MenuKeys | string) {
        const menuItem = subMenusStore.findByKey(key);
        if ($menuVisiblilityStore) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
            return;
        }
        activeSubMenuStore.activateByMenuItem(menuItem);
        menuVisiblilityStore.set(true);

        resetChatVisibility();
        resetModalVisibility();
    }

    function openBo() {
        if (!ADMIN_BO_URL) {
            throw new Error("ADMIN_BO_URL not set");
        }
        const url = new URL(ADMIN_BO_URL, window.location.href);
        url.searchParams.set("playUri", window.location.href);
        window.open(url, "_blank");
    }

    function openEditNameScene() {
        loginSceneVisibleStore.set(true);
        gameManager.leaveGame(LoginSceneName, new LoginScene());
    }

    function openEditSkinScene() {
        selectCharacterSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCharacterSceneName, new SelectCharacterScene());
    }

    function openEditCompanionScene() {
        selectCompanionSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCompanionSceneName, new SelectCompanionScene());
    }

    function openEnableCameraScene() {
        enableCameraSceneVisibilityStore.showEnableCameraScene();
        gameManager.leaveGame(EnableCameraSceneName, new EnableCameraScene());
    }

    /*function register() {
    modalIframeStore.set(
    {
    src: https://workadventu.re/funnel/connection?roomUrl=${window.location.toString()},
    allow: "fullscreen",
    allowApi: true,
    position: "center",
    title: $LL.menu.icon.open.register()
    }
    );

    //resetMenuVisibility();
    //resetChatVisibility();

    window.open("https://workadventu.re/getting-started", "_blank");
    }*/

    function resetModalVisibility() {
        modalVisibilityStore.set(false);
        modalIframeStore.set(null);
        showModalGlobalComminucationVisibilityStore.set(false);
    }

    /*function resetMenuVisibility() {
    menuVisiblilityStore.set(false);
    activeSubMenuStore.set(0);
    }*/

    function resetChatVisibility() {
        chatVisibilityStore.set(false);
    }

    function noDrag(): boolean {
        return false;
    }

    function openExternalModuleCalendar() {
        isCalendarVisibleStore.set(!$isCalendarVisibleStore);
        isTodoListVisibleStore.set(false);
        mapEditorModeStore.switchMode(false);
    }

    function openExternalModuleTodoList() {
        isTodoListVisibleStore.set(!$isTodoListVisibleStore);
        isCalendarVisibleStore.set(false);
        mapEditorModeStore.switchMode(false);
    }

    let totalMessagesToSee = writable<number>(0);

    onMount(() => {
        //resizeObserver.observe(mainHtmlDiv);
    });

    onDestroy(() => {
        //resizeObserver.disconnect();
    });

    function buttonActionBarTrigger(id: string) {
        const button = $additionnalButtonsMenu.get(id) as AddButtonActionBarEvent;
        return iframeListener.sendButtonActionBarTriggered(button);
    }

    let isMobile = isMediaBreakpointUp("md");
    // FIXME: the code below was stopping the map editor when going in small screen
    /*const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
        if (isMobile) {
            mapEditorModeStore.set(false);
        }
    });*/

    function openAppMenu() {
        activeSecondaryZoneActionBarStore.set(undefined);
        appMenuOpened = !appMenuOpened;
    }
    function showRoomList() {
        resetChatVisibility();
        resetModalVisibility();

        roomListVisibilityStore.set(true);
    }

    const statusToShow: Array<RequestedStatus | AvailabilityStatus.ONLINE> = [
        AvailabilityStatus.ONLINE,
        AvailabilityStatus.BUSY,
        AvailabilityStatus.BACK_IN_A_MOMENT,
        AvailabilityStatus.DO_NOT_DISTURB,
    ];

    const cameraButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [availabilityStatusStore, requestedCameraState],
        ([$availabilityStatusStore, $requestedCameraState]) => {
            if (
                $availabilityStatusStore === AvailabilityStatus.AWAY ||
                $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
                $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB
            ) {
                return "disabled";
            }
            return $requestedCameraState ? "normal" : "forbidden";
        }
    );

    const microphoneButtonStateStore: Readable<"active" | "disabled" | "normal" | "forbidden"> = derived(
        [availabilityStatusStore, requestedMicrophoneState],
        ([$availabilityStatusStore, $requestedMicrophoneState]) => {
            if (
                $availabilityStatusStore === AvailabilityStatus.AWAY ||
                $availabilityStatusStore === AvailabilityStatus.BACK_IN_A_MOMENT ||
                $availabilityStatusStore === AvailabilityStatus.DO_NOT_DISTURB
            ) {
                return "disabled";
            }
            return $requestedMicrophoneState ? "normal" : "forbidden";
        }
    );
</script>

<div
    class="@container/actions w-full z-[301] transition-all pointer-events-none bp-menu {$peerStore.size > 0 &&
    $highlightFullScreen
        ? 'hidden'
        : ''}"
>
    <div class="flex w-full p-2 space-x-2 @xl/actions:p-4 @xl/actions:space-x-4 screen-blocker">
        <div class="justify-start flex-1 w-32">
            <div
                class="flex relative transition-all duration-150 z-[2] {$chatVisibilityStore ? 'hidden' : ''}"
                class:opacity-0={$chatVisibilityStore}
                data-testid="chat-action"
            >
                <ActionBarButtonWrapper classList="group/btn-message-circle">
                    <ActionBarIconButton
                        on:click={() => {
                            toggleChat();
                            navChat.switchToChat();
                            analyticsClient.openedChat();
                        }}
                        tooltipTitle={$LL.actionbar.help.chat.title()}
                        tooltipDesc={$LL.actionbar.help.chat.desc()}
                        dataTestId="chat-btn"
                        state={"normal"}
                        disabledHelp={false}
                    >
                        <MessageCircleIcon />
                    </ActionBarIconButton>
                    {#if $chatZoneLiveStore || $peerStore.size > 0}
                        <div>
                            <span class="w-4 h-4 block rounded-full absolute -top-1 -left-1 animate-ping bg-white" />
                            <span class="w-3 h-3 block rounded-full absolute -top-0.5 -left-0.5 bg-white" />
                        </div>
                    {:else if $totalMessagesToSee > 0}
                        <div
                            class="absolute -top-2 -left-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full z-10"
                        >
                            {$totalMessagesToSee}
                        </div>
                    {/if}
                </ActionBarButtonWrapper>
                <ActionBarButtonWrapper classList="group/btn-users">
                    <ActionBarIconButton
                        on:click={() => {
                            toggleChat();
                            navChat.switchToUserList();
                        }}
                        tooltipTitle={$LL.actionbar.help.users.title()}
                        tooltipDesc={$LL.actionbar.help.users.desc()}
                        state={"normal"}
                        dataTestId="user-list-button"
                        disabledHelp={false}
                    >
                        <UsersIcon />
                    </ActionBarIconButton>
                </ActionBarButtonWrapper>
            </div>
        </div>
        <div
            class="@xxs/actions:justify-center justify-end main-action pointer-events-auto min-w-32 @sm/actions:min-w-[192px]"
        >
            <div class="flex justify-center relative space-x-0 @md/actions:space-x-2 @xl/actions:space-x-4">
                {#if !$silentStore}
                    <div>
                        <div class="flex items-center">
                            {#if $audioManagerVisibilityStore !== "hidden"}
                                <ActionBarButtonWrapper classList="group/btn-music">
                                    <ActionBarIconButton
                                        on:click={() => {
                                            if (
                                                $audioManagerVisibilityStore === "visible" &&
                                                $audioManagerPlayerState !== "not_allowed" &&
                                                $activeSecondaryZoneActionBarStore !== "audio-manager"
                                            ) {
                                                activeSecondaryZoneActionBarStore.set("audio-manager");
                                            } else if (
                                                $audioManagerVisibilityStore === "visible" &&
                                                $audioManagerPlayerState === "not_allowed"
                                            ) {
                                                audioManagerRetryPlaySubject.next();
                                            } else {
                                                activeSecondaryZoneActionBarStore.set(undefined);
                                            }
                                        }}
                                        tooltipTitle={$audioManagerPlayerState !== "not_allowed"
                                            ? $LL.actionbar.help.audioManager.title()
                                            : $LL.actionbar.help.audioManagerNotAllowed.title()}
                                        tooltipDesc={$audioManagerPlayerState !== "not_allowed"
                                            ? $LL.actionbar.help.audioManager.desc()
                                            : $LL.actionbar.help.audioManagerNotAllowed.desc()}
                                        state={$audioManagerVisibilityStore === "visible"
                                            ? $audioManagerPlayerState !== "not_allowed"
                                                ? $activeSecondaryZoneActionBarStore !== "audio-manager"
                                                    ? "normal"
                                                    : "active"
                                                : "forbidden"
                                            : $audioManagerVisibilityStore === "error"
                                            ? "forbidden"
                                            : $audioManagerVisibilityStore === "disabledBySettings"
                                            ? "disabled"
                                            : undefined}
                                        dataTestId="music-button"
                                    >
                                        <IconMusic height="24" width="24" />
                                    </ActionBarIconButton>
                                    {#if $activeSecondaryZoneActionBarStore === "audio-manager"}
                                        <AudioManager />
                                    {/if}
                                </ActionBarButtonWrapper>
                            {/if}

                            <ActionBarButtonWrapper classList="group/btn-emoji">
                                <ActionBarIconButton
                                    on:click={() => {
                                        toggleEmojiPicker();
                                    }}
                                    tooltipTitle={$LL.actionbar.help.emoji.title()}
                                    tooltipDesc={$LL.actionbar.help.emoji.desc()}
                                    state={$activeSecondaryZoneActionBarStore === "emote" ? "active" : "normal"}
                                    dataTestId={undefined}
                                >
                                    <EmojiIcon
                                        strokeColor={$activeSecondaryZoneActionBarStore === "emote"
                                            ? "stroke-white fill-white"
                                            : "stroke-white fill-transparent"}
                                        hover="group-hover/btn-emoji:fill-white"
                                    />
                                </ActionBarIconButton>
                                {#if $activeSecondaryZoneActionBarStore === "emote"}
                                    <EmojiSubMenu />
                                {/if}
                            </ActionBarButtonWrapper>
                            <ActionBarButtonWrapper classList="group/btn-apps">
                                <ActionBarIconButton
                                    on:click={() => {
                                        openAppMenu();
                                    }}
                                    tooltipTitle={$LL.actionbar.help.apps.title()}
                                    tooltipDesc={$LL.actionbar.help.apps.desc()}
                                    disabledHelp={appMenuOpened}
                                    state={appMenuOpened ? "active" : "normal"}
                                    dataTestId={undefined}
                                >
                                    <AppsIcon
                                        strokeColor={appMenuOpened
                                            ? "stroke-white fill-white"
                                            : "stroke-white fill-transparent"}
                                        hover="group-hover/btn-apps:fill-white"
                                    />
                                </ActionBarIconButton>

                                {#if appMenuOpened && ($roomListActivated || $isCalendarActivatedStore || $isTodoListActivatedStore || $externalActionBarSvelteComponent.size > 0)}
                                    <div class="flex justify-center m-auto absolute -left-1.5 top-[69px]">
                                        <img
                                            alt="Sub menu arrow"
                                            loading="eager"
                                            src={tooltipArrow}
                                            class="content-[''] absolute -top-1 left-9 m-auto w-2 h-1"
                                        />
                                        <div class="bottom-action-bar">
                                            <div
                                                class="bottom-action-section flex flex-col animate bg-contrast/80 backdrop-blur-md rounded-md p-1"
                                            >
                                                <!-- Room list part -->
                                                {#if $roomListActivated}
                                                    <!-- TODO button hep -->
                                                    <!-- Room list button -->
                                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                    <div
                                                        on:dragstart|preventDefault={noDrag}
                                                        on:click={() => analyticsClient.openedRoomList()}
                                                        on:click={showRoomList}
                                                        on:click={openAppMenu}
                                                        class="bottom-action-button"
                                                    >
                                                        <!--
                                                        {#if !isMobile}
                                                            <HelpTooltip
                                                                title={$LL.actionbar.help.roomList.title()}
                                                                desc={$LL.actionbar.help.roomList.desc()}
                                                            />
                                                        {/if}
                                                        -->

                                                        <button
                                                            id="roomListIcon"
                                                            class="hover:bg-white/10 rounded flex w-full space-x-2 items-center p-2"
                                                        >
                                                            <svg
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                viewBox="0 0 24 24"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                stroke-linecap="round"
                                                                stroke-linejoin="round"
                                                                width="20"
                                                                height="20"
                                                                stroke-width="1.5"
                                                            >
                                                                <path d="M21 12a9 9 0 1 0 -9 9" />
                                                                <path d="M3.6 9h16.8" />
                                                                <path d="M3.6 15h7.9" />
                                                                <path d="M11.5 3a17 17 0 0 0 0 18" />
                                                                <path d="M12.5 3a16.984 16.984 0 0 1 2.574 8.62" />
                                                                <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                                                                <path d="M20.2 20.2l1.8 1.8" />
                                                            </svg>
                                                            <div
                                                                class="whitespace-nowrap bold text-sm grow pr-2 text-left"
                                                            >
                                                                {$LL.actionbar.help.roomList.title()}
                                                            </div>
                                                        </button>
                                                    </div>
                                                {/if}

                                                <!-- Calendar integration -->
                                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                <div
                                                    on:dragstart|preventDefault={noDrag}
                                                    on:click={() => analyticsClient.openExternalModuleCalendar()}
                                                    on:click={openExternalModuleCalendar}
                                                    on:click={openAppMenu}
                                                    class="bottom-action-button"
                                                >
                                                    <!--
                                                    {#if !isMobile}
                                                        <HelpTooltip
                                                            title={$isCalendarActivatedStore
                                                                ? $LL.actionbar.help.calendar.title()
                                                                : $LL.actionbar.featureNotAvailable()}
                                                            desc={$isCalendarActivatedStore
                                                                ? $LL.actionbar.help.calendar.desc()
                                                                : ""}
                                                        />
                                                    {/if}
                                                    -->
                                                    <button
                                                        id="calendarIcon"
                                                        class="hover:bg-white/10 rounded flex w-full space-x-2 items-center p-2"
                                                        class:!cursor-not-allowed={!$isCalendarActivatedStore}
                                                        class:!no-pointer-events={!$isCalendarActivatedStore}
                                                        on:click={openAppMenu}
                                                        disabled={!$isCalendarActivatedStore}
                                                    >
                                                        <IconCalendar width="20" height="20" />
                                                        <div class="whitespace-nowrap bold text-sm grow pr-2 text-left">
                                                            {$LL.actionbar.calendar()}
                                                        </div>
                                                    </button>
                                                </div>

                                                <!-- Todo List Integration -->
                                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                <div
                                                    on:dragstart|preventDefault={noDrag}
                                                    on:click={() => analyticsClient.openExternalModuleTodoList()}
                                                    on:click={openExternalModuleTodoList}
                                                    on:click={openAppMenu}
                                                    class="bottom-action-button"
                                                >
                                                    <!--
                                                    {#if !isMobile}
                                                        <HelpTooltip
                                                            title={$isTodoListActivatedStore
                                                                ? $LL.actionbar.help.todolist.title()
                                                                : $LL.actionbar.featureNotAvailable()}
                                                            desc={$isTodoListActivatedStore
                                                                ? $LL.actionbar.help.todolist.desc()
                                                                : ""}
                                                        />
                                                    {/if}
                                                    -->
                                                    <button
                                                        id="todoListIcon"
                                                        class="hover:bg-white/10 rounded flex w-full space-x-2 items-center p-2"
                                                        class:!cursor-not-allowed={!$isTodoListActivatedStore}
                                                        class:!no-pointer-events={!$isTodoListActivatedStore}
                                                        disabled={!$isTodoListActivatedStore}
                                                    >
                                                        <IconCheckList width="20" height="20" />
                                                        <div class="whitespace-nowrap bold text-sm grow pr-2 text-left">
                                                            {$LL.actionbar.todoList()}
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            <div class="bottom-action-section flex animate">
                                                <!-- External module action bar -->
                                                {#if $externalActionBarSvelteComponent.size > 0}
                                                    {#each [...$externalActionBarSvelteComponent.entries()] as [id, value] (`externalActionBarSvelteComponent-${id}`)}
                                                        <svelte:component
                                                            this={value.componentType}
                                                            extensionModule={value.extensionModule}
                                                            {isMobile}
                                                        />
                                                    {/each}
                                                {/if}
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                            </ActionBarButtonWrapper>

                            {#if $bottomActionBarVisibilityStore}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 rounded btn-layout/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all"
                                    on:click={() => analyticsClient.layoutPresentChange()}
                                    on:click={switchLayoutMode}
                                >
                                    {#if $embedScreenLayoutStore === LayoutMode.Presentation}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="icon icon-tabler icon-tabler-arrows-minimize"
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
                                            <path d="M5 9l4 0l0 -4" />
                                            <path d="M3 3l6 6" />
                                            <path d="M5 15l4 0l0 4" />
                                            <path d="M3 21l6 -6" />
                                            <path d="M19 9l-4 0l0 -4" />
                                            <path d="M15 9l6 -6" />
                                            <path d="M19 15l-4 0l0 4" />
                                            <path d="M15 15l6 6" />
                                        </svg>
                                    {:else}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            class="icon icon-tabler icon-tabler-arrows-maximize"
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
                                            <path d="M16 4l4 0l0 4" />
                                            <path d="M14 10l6 -6" />
                                            <path d="M8 20l-4 0l0 -4" />
                                            <path d="M4 20l6 -6" />
                                            <path d="M16 20l4 0l0 -4" />
                                            <path d="M14 14l6 6" />
                                            <path d="M8 4l-4 0l0 4" />
                                            <path d="M4 4l6 6" />
                                        </svg>
                                    {/if}
                                </div>

                                <ActionBarButtonWrapper classList="group/btn-follow">
                                    <ActionBarIconButton
                                        on:click={() => {
                                            analyticsClient.follow();
                                            followClick();
                                        }}
                                        tooltipTitle={$followStateStore === "active"
                                            ? $LL.actionbar.help.unfollow.title()
                                            : $LL.actionbar.help.follow.title()}
                                        tooltipDesc={$followStateStore === "active"
                                            ? $LL.actionbar.help.unfollow.desc()
                                            : $LL.actionbar.help.follow.desc()}
                                        disabledHelp={appMenuOpened}
                                        state={$followStateStore === "active" ? "active" : "normal"}
                                        dataTestId={undefined}
                                    >
                                        <FollowIcon />
                                    </ActionBarIconButton>
                                </ActionBarButtonWrapper>
                                <ActionBarButtonWrapper classList="group/btn-lock">
                                    <ActionBarIconButton
                                        on:click={() => {
                                            analyticsClient.lockDiscussion();
                                            lockClick();
                                        }}
                                        tooltipTitle={$LL.actionbar.help.lock.title()}
                                        tooltipDesc={$LL.actionbar.help.lock.desc()}
                                        disabledHelp={appMenuOpened}
                                        state={$currentPlayerGroupLockStateStore ? "forbidden" : "normal"}
                                        dataTestId="lock-button"
                                    >
                                        {#if $currentPlayerGroupLockStateStore}
                                            <LockIcon />
                                        {:else}
                                            <LockOpenIcon />
                                        {/if}
                                    </ActionBarIconButton>
                                </ActionBarButtonWrapper>
                            {/if}
                        </div>
                    </div>
                {:else}
                    <SilentBlock />
                {/if}
                <div>
                    <!-- ACTION WRAPPER : CAM & MIC -->
                    <div class="group/hardware flex items-center relative">
                        {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore && $myMicrophoneStore}
                            <ActionBarButtonWrapper classList="group/btn-mic peer/mic">
                                <ActionBarIconButton
                                    on:click={() => {
                                        analyticsClient.microphone();
                                        microphoneClick();
                                    }}
                                    tooltipTitle={$microphoneButtonStateStore === "disabled"
                                        ? $LL.actionbar.help.micDisabledByStatus.title()
                                        : $LL.actionbar.help.mic.title()}
                                    tooltipDesc={$microphoneButtonStateStore === "disabled"
                                        ? $LL.actionbar.help.micDisabledByStatus.desc({
                                              status: getStatusLabel($availabilityStatusStore),
                                          })
                                        : $LL.actionbar.help.mic.desc()}
                                    disabledHelp={appMenuOpened}
                                    state={$microphoneButtonStateStore}
                                    dataTestId="microphone-button"
                                >
                                    {#if $requestedMicrophoneState && !$silentStore}
                                        <MicOnIcon />
                                    {:else}
                                        <MicOffIcon />
                                    {/if}
                                </ActionBarIconButton>
                            </ActionBarButtonWrapper>
                        {/if}
                        {#if smallArrowVisible}
                            <div
                                class="absolute h-3 w-7 rounded-b bg-contrast/80 backdrop-blur left-0 right-0 m-auto p-1 z-10 opacity-0 transition-all -bottom-3 hidden sm:block {mediaSettingsDisplayed
                                    ? 'opacity-100'
                                    : 'group-hover/hardware:opacity-100'}"
                            >
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="absolute bottom-1 left-0 right-0 m-auto hover:bg-white/10 h-5 w-5 flex items-center justify-center rounded-sm"
                                    on:click|stopPropagation|preventDefault={() =>
                                        (mediaSettingsDisplayed = !mediaSettingsDisplayed)}
                                >
                                    <ChevronUpIcon
                                        height="h-4"
                                        width="w-4"
                                        classList="aspect-square transition-all {mediaSettingsDisplayed
                                            ? ''
                                            : 'rotate-180'}"
                                        strokeWidth="2"
                                    />
                                </div>
                            </div>
                        {/if}
                        {#if mediaSettingsDisplayed}
                            <MediaSettingsList on:close={() => (mediaSettingsDisplayed = false)} />
                        {/if}
                        <!-- NAV : CAMERA START -->
                        {#if !$inExternalServiceStore && $myCameraStore && !$silentStore}
                            <ActionBarButtonWrapper classList="group/btn-cam">
                                <ActionBarIconButton
                                    on:click={() => {
                                        analyticsClient.camera();
                                        cameraClick();
                                    }}
                                    tooltipTitle={$cameraButtonStateStore === "disabled"
                                        ? $LL.actionbar.help.camDisabledByStatus.title()
                                        : $LL.actionbar.help.cam.title()}
                                    tooltipDesc={$cameraButtonStateStore === "disabled"
                                        ? $LL.actionbar.help.camDisabledByStatus.desc({
                                              status: getStatusLabel($availabilityStatusStore),
                                          })
                                        : $LL.actionbar.help.cam.desc()}
                                    disabledHelp={appMenuOpened}
                                    state={$cameraButtonStateStore}
                                    dataTestId="camera-button"
                                >
                                    {#if $requestedCameraState && !$silentStore}
                                        <CamOnIcon />
                                    {:else}
                                        <CamOffIcon />
                                    {/if}
                                </ActionBarIconButton>
                            </ActionBarButtonWrapper>
                        {/if}
                        <!-- NAV : CAMERA END -->

                        <!-- NAV : SCREENSHARING START -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        {#if $bottomActionBarVisibilityStore}
                            <ActionBarButtonWrapper classList="group/btn-screen-share">
                                <ActionBarIconButton
                                    on:click={() => {
                                        analyticsClient.screenSharing();
                                        screenSharingClick();
                                    }}
                                    tooltipTitle={$LL.actionbar.help.share.title()}
                                    tooltipDesc={$LL.actionbar.help.share.desc()}
                                    disabledHelp={appMenuOpened}
                                    state={!$screenSharingActivatedStore
                                        ? "disabled"
                                        : $requestedScreenSharingState && !$silentStore
                                        ? "active"
                                        : "normal"}
                                    dataTestId="screenShareButton"
                                >
                                    {#if $requestedScreenSharingState && !$silentStore}
                                        <ScreenShareOffIcon />
                                    {:else}
                                        <ScreenShareIcon />
                                    {/if}
                                </ActionBarIconButton>
                            </ActionBarButtonWrapper>

                            {#if camMenuIsDropped}
                                <div
                                    class="absolute bottom-20 sm:right-20 sm:bottom-auto md:mt-2 md:top-14 @xl/actions:top-16 bg-contrast/80 backdrop-blur rounded-lg py-2 w-56 sm:left-24 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-transparent before:border-b-contrast/80 transition-all @md/actions:block max-h-[calc(100vh-96px)] overflow-y-auto"
                                    transition:fly={{ y: 40, duration: 150 }}
                                >
                                    <div class="p-0 m-0 list-none">
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={lightModeOn}
                                        >
                                            <div class="transition-all w-6 h-6 aspect-square text-center">
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.lightMode()}</div>
                                        </button>
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={focusModeOn}
                                        >
                                            <div class="transition-all w-6 h-6 aspect-square text-center">
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.focusMode()}</div>
                                        </button>
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={rightModeOn}
                                        >
                                            <div class="transition-all w-6 h-6 aspect-square text-center">
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.rightMode()}</div>
                                        </button>
                                        {#if $highlightedEmbedScreen}
                                            <button
                                                class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                                on:click={hideModeOn}
                                            >
                                                <div class="transition-all w-6 h-6 aspect-square text-center">
                                                    <ProfilIcon />
                                                </div>
                                                <div>{$LL.actionbar.hideMode()}</div>
                                            </button>
                                        {/if}
                                    </div>
                                    <div
                                        class="flex justify-center hover:cursor-pointer"
                                        on:click={() => (camMenuIsDropped = !camMenuIsDropped)}
                                    >
                                        <IconArrowDown />
                                    </div>
                                </div>
                            {/if}
                        {/if}

                        <!-- NAV : SCREENSHARING END -->
                    </div>
                </div>
            </div>
        </div>
        <div id="action-wrapper" class="flex-1 justify-end">
            <div class="flex justify-end space-x-0 md:space-x-2 xl:space-x-4">
                {#if $addActionButtonActionBarEvent.length > 0}
                    <div class="items-center relative hidden @lg/actions:flex">
                        {#each $addActionButtonActionBarEvent as button, index (index)}
                            <div
                                class="group/btn-custom{button.id} peer/custom{button.id} relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg"
                            >
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    on:dragstart|preventDefault={noDrag}
                                    on:click={() =>
                                        analyticsClient.clickOnCustomButton(
                                            button.id,
                                            undefined,
                                            button.toolTip,
                                            button.imageSrc
                                        )}
                                    on:click={() => {
                                        buttonActionBarTrigger(button.id);
                                    }}
                                    on:mouseenter={() => {
                                        !navigating ? (helpActive = button.id) : "";
                                    }}
                                    on:mouseleave={() => {
                                        !navigating ? (helpActive = undefined) : "";
                                    }}
                                    class="h-12 min-w-12 @sm/actions:min-w-10 @sm/actions:h-10 @xl/actions:h-12 @xl/actions:min-w-12 p-1 m-0 rounded hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer pointer-events-auto"
                                >
                                    {#if button.toolTip}
                                        {#if helpActive === button.id}
                                            <HelpTooltip
                                                delayBeforeAppear={0}
                                                hasDesc={false}
                                                hasImage={false}
                                                title={button.toolTip}
                                            />
                                        {/if}
                                    {/if}
                                    <div id={button.id} class="h-6">
                                        <img draggable="false" src={button.imageSrc} alt={button.toolTip} class="h-6" />
                                        <!-- src="./static/images/Workadventure.gif"   src={button.imageSrc}   -->
                                    </div>
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
                {#if $inviteUserActivated}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div id="action-invite" class="transition-all hidden @lg/actions:block">
                        <div class="flex items-center">
                            <div
                                class="flex items-center bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg pointer-events-auto"
                            >
                                {#each $addClassicButtonActionBarEvent as button, index (index)}
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    <div
                                        class="flex flex-initial"
                                        on:dragstart|preventDefault={noDrag}
                                        on:click={() => analyticsClient.clickOnCustomButton(button.id, button.label)}
                                        on:click={() => {
                                            buttonActionBarTrigger(button.id);
                                        }}
                                    >
                                        <button
                                            class="btn btn-light rounded h-12 @sm/actions:h-10 @xl/actions:h-12 text-base @sm/actions:text-sm @xl/actions:text-base mr-2 select-none whitespace-nowrap !px-4 transition-all"
                                            id={button.id}
                                        >
                                            {button.label}
                                        </button>
                                    </div>
                                {/each}
                                {#if $inviteUserActivated}
                                    <button
                                        on:dragstart|preventDefault={noDrag}
                                        on:click={() => analyticsClient.openInvite()}
                                        on:click={() => showMenuItem(SubMenusInterface.invite)}
                                        class="btn h-12 @sm/actions:h-10 @xl/actions:h-12 text-base @sm/actions:text-sm @xl/actions:text-base rounded select-none !px-4 transition-all {!$userIsConnected &&
                                        ENABLE_OPENID
                                            ? 'btn-ghost btn-light'
                                            : 'btn-secondary'}"
                                        id="invite-btn"
                                    >
                                        {$LL.menu.sub.invite()}
                                    </button>
                                {/if}
                                {#if !$userIsConnected && ENABLE_OPENID}
                                    <a
                                        href="/login"
                                        on:click={() => analyticsClient.login()}
                                        class="btn btn-secondary h-12 @sm/actions:h-10 @xl/actions:h-12 text-base @sm/actions:text-sm @xl/actions:text-base rounded select-none ml-2 !px-4 transition-all"
                                    >
                                        {$LL.actionbar.login()}
                                    </a>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}
                <MapSubMenu />

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    data-testid="action-user"
                    class="flex items-center relative transition-all hidden @md/actions:flex cursor-pointer pointer-events-auto"
                    on:click={() => (profileMenuIsDropped = !profileMenuIsDropped)}
                    on:click|preventDefault={close}
                    on:blur={() => (profileMenuIsDropped = false)}
                >
                    <div
                        class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2"
                    >
                        <div
                            class="flex items-center h-full group-hover:bg-white/10 transition-all group-hover:rounded space-x-2 pl-2 pr-3"
                        >
                            <Woka userId={-1} placeholderSrc="" customWidth="32px" customHeight="32px" />
                            <div class="grow flex flex-row @xl/actions:flex-col justify-start text-left pr-2">
                                <div
                                    class="font-bold text-white leading-5 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base order-last @xl/actions:order-first flex items-center"
                                >
                                    {userName}
                                </div>
                                <div class="text-xxs bold whitespace-nowrap select-none flex items-center">
                                    <div
                                        class="aspect-square h-2 w-2 rounded-full mr-1.5"
                                        style="background-color: {getColorHexOfStatus($availabilityStatusStore)}"
                                    />
                                    <div
                                        class="hidden @xl/actions:block"
                                        style="color: {getColorHexOfStatus(
                                            $availabilityStatusStore
                                        )};filter: brightness(200%);"
                                    >
                                        {getStatusLabel($availabilityStatusStore)}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <ChevronDownIcon
                                    strokeWidth="2"
                                    classList="transition-all opacity-50 {profileMenuIsDropped ? 'rotate-180' : ''}"
                                    height="h-4"
                                    width="w-4"
                                />
                            </div>
                        </div>
                    </div>
                    {#if profileMenuIsDropped}
                        <div
                            class="absolute mt-2 top-14 @xl/actions:top-16 bg-contrast/80 backdrop-blur rounded-md p-1 w-56 right-0 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-transparent before:border-b-contrast/80 transition-all hidden @md/actions:block max-h-[calc(100vh-96px)] overflow-y-auto"
                            data-testid="profile-menu"
                            transition:fly={{ y: 40, duration: 150 }}
                            use:clickOutside={() => {
                                profileMenuIsDropped = false;
                            }}
                        >
                            <div class="p-0 m-0 list-none">
                                <a
                                    href="https://workadventu.re/pricing/"
                                    target="_blank"
                                    class="group flex p-1 transition-all cursor-pointer text-sm font-bold w-full text-white no-underline bg-white/10 rounded hover:bg-white/20"
                                >
                                    <div class="flex items-center px-3 py-3 w-full">
                                        <div class="w-full text-left leading-4">{$LL.actionbar.accountType()}</div>
                                        <div class="">
                                            <div class="btn btn-light btn-sm">
                                                {$LL.actionbar.upgrade()}
                                            </div>
                                        </div>
                                    </div>
                                </a>
                                <AvailabilityStatusList statusInformation={getStatusInformation(statusToShow)} />
                                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold">
                                    {$LL.menu.sub.profile()}
                                </div>
                                <button
                                    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                    on:click={() => openEditNameScene()}
                                >
                                    <div
                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"
                                    >
                                        <ProfilIcon />
                                    </div>
                                    <div class="text-left leading-4 flex items-center">{$LL.actionbar.profil()}</div>
                                </button>
                                <button
                                    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                    on:click={() => openEditSkinScene()}
                                >
                                    <div
                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"
                                    >
                                        <Woka userId={-1} placeholderSrc="" customWidth="26px" customHeight="26px" />
                                    </div>
                                    <div class="text-left leading-4 flex items-center">{$LL.actionbar.woka()}</div>
                                </button>
                                <button
                                    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                    on:click={() => openEditCompanionScene()}
                                >
                                    <div
                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"
                                    >
                                        <Companion
                                            userId={-1}
                                            placeholderSrc="./static/images/default-companion.png"
                                            width="26px"
                                            height="26px"
                                        />
                                    </div>
                                    <div class="text-left leading-4 flex items-center">{$LL.actionbar.companion()}</div>
                                </button>
                                <button
                                    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                >
                                    <div
                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"
                                    >
                                        <AchievementIcon />
                                    </div>
                                    <div class="text-left flex items-center">{$LL.actionbar.quest()}</div>
                                </button>
                                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold">
                                    Settings
                                </div>
                                <button
                                    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                    on:click={openEnableCameraScene}
                                >
                                    <div
                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"
                                    >
                                        <CamSettingsIcon />
                                    </div>
                                    <div class="text-left leading-4 flex items-center">
                                        {$LL.actionbar.editCamMic()}
                                    </div>
                                </button>
                                <button
                                    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                    id="settings"
                                    on:click={() => showMenuItem(SubMenusInterface.settings)}
                                >
                                    <div
                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"
                                    >
                                        <SettingsIcon />
                                    </div>
                                    <div class="text-left leading-4 flex items-center">
                                        {$LL.actionbar.otherSettings()}
                                    </div>
                                </button>

                                <button
                                    on:click={() => analyticsClient.logout()}
                                    on:click={() => connectionManager.logout()}
                                    class="group flex p-2 gap-2 items-center hover:bg-danger-600 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                >
                                    <div
                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"
                                    >
                                        <IconLogout
                                            height="20"
                                            width="20"
                                            class="text-danger-600 group-hover:text-white"
                                        />
                                    </div>
                                    <div
                                        class="text-left leading-4 text-danger-600 group-hover:text-white flex items-center"
                                    >
                                        {$LL.menu.profile.logout()}
                                    </div>
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
                <div use:clickOutside={() => (burgerOpen = false)}>
                    <ActionBarButtonWrapper classList="group/btn-burger @lg:hidden rounded-r-lg pr-2">
                        <ActionBarIconButton
                            dataTestId="burger-menu"
                            on:click={() => {
                                burgerOpen = !burgerOpen;
                            }}
                            on:blur={() => (burgerOpen = false)}
                        >
                            {#if !burgerOpen}
                                <!-- pointer-events-none is important for clickOutside to work. Otherwise, the
                                     SVG is the target of the click, is removed from the DOM on click and considered to be
                                     outside the main div -->
                                <MenuBurgerIcon classList="pointer-events-none" />
                            {:else}
                                <XIcon classList="pointer-events-none" />
                            {/if}
                        </ActionBarIconButton>
                    </ActionBarButtonWrapper>
                    {#if burgerOpen}
                        <div
                            class="mobile:bottom-14 w-48 bg-contrast/80 absolute right-2 top-auto z-[1000] py-4 rounded-lg text-right text-white no-underline pointer-events-auto block @lg:hidden before:content-[''] before:absolute before:w-0 before:h-0 sm:before:-top-[14px] sm:before:bottom-auto before:-bottom-4 before:top-auto before:rotate-180 sm:before:rotate-0 before:right-5 before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all"
                            transition:fly={{ y: 40, duration: 150 }}
                        >
                            <div class="block @md/actions:hidden">
                                <AvailabilityStatusList
                                    statusInformation={getStatusInformation(statusToShow)}
                                    align="right"
                                />
                                <div class="flex text-xxs uppercase text-white/50 px-4 py-2 relative justify-end">
                                    {$LL.menu.sub.profile()}
                                </div>

                                <button
                                    class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                    on:click={() => openEditNameScene()}
                                >
                                    {$LL.actionbar.profil()}
                                </button>
                                <button
                                    class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                    on:click={() => openEditSkinScene()}
                                >
                                    <div>{$LL.actionbar.woka()}</div>
                                </button>
                                <button
                                    class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                    on:click={() => openEditCompanionScene()}
                                >
                                    {$LL.actionbar.companion()}
                                </button>
                                <button class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold">
                                    {$LL.actionbar.quest()}
                                </button>
                                <button
                                    class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                    on:click={openEnableCameraScene}
                                >
                                    {$LL.actionbar.editCamMic()}
                                </button>
                                <button
                                    class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                    on:click={() => showMenuItem(SubMenusInterface.settings)}
                                >
                                    {$LL.actionbar.otherSettings()}
                                </button>

                                {#if $peerStore.size > 0}
                                    <div class="h-[1px] w-full bg-white/10 my-2 block @md/actions:hidden" />
                                    <div class="flex text-xxs uppercase text-white/50 px-4 py-2 relative justify-end">
                                        Camera
                                    </div>

                                    <button
                                        class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                        on:click={() => analyticsClient.screenSharing()}
                                        on:click={screenSharingClick}
                                        on:click={() => (burgerOpen = !burgerOpen)}
                                        on:mouseenter={() => {
                                            !navigating ? (helpActive = "share") : "";
                                        }}
                                        on:mouseleave={() => {
                                            !navigating ? (helpActive = undefined) : "";
                                        }}
                                    >
                                        {#if $requestedScreenSharingState}
                                            {$LL.actionbar.stopScreenSharing()}
                                        {:else}
                                            {$LL.actionbar.startScreenSharing()}
                                        {/if}
                                    </button>

                                    <button
                                        class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                        on:click={() => analyticsClient.screenSharing()}
                                        on:click={() => (camMenuIsDropped = !camMenuIsDropped)}
                                        on:click={() => (burgerOpen = !burgerOpen)}
                                        on:click={() => (smallArrowVisible = !smallArrowVisible)}
                                        on:mouseenter={() => {
                                            !navigating ? (helpActive = "share") : "";
                                        }}
                                        on:mouseleave={() => {
                                            !navigating ? (helpActive = undefined) : "";
                                        }}
                                    >
                                        <!-- <p>Screen Sharing Mode</p> -->
                                        {$LL.actionbar.screenSharingMode()}
                                    </button>
                                {/if}
                            </div>
                            {#if $mapMenuVisibleStore}
                                <div class="h-[1px] w-full bg-white/10 my-2 block @md/actions:hidden" />
                                <div class="flex text-xxs uppercase text-white/50 px-4 py-2 relative justify-end">
                                    {$LL.actionbar.map()}
                                </div>
                            {/if}
                            <!-- FIXME: we need proper "if" around the items of the burger menu. Should we centralize the notion of button? -->
                            {#if $backOfficeMenuVisibleStore}
                                <button
                                    class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                    on:click={() => openBo()}
                                >
                                    {$LL.actionbar.bo()}
                                </button>
                            {/if}
                            {#if $globalMessageVisibleStore}
                                <button class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold">
                                    {$LL.actionbar.globalMessage()}
                                </button>
                            {/if}
                            <!--{#if $megaphoneCanBeUsedStore && !$silentStore && ($myMicrophoneStore || $myCameraStore)}-->
                            <!--    <button class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold">-->
                            <!--        {$LL.actionbar.megaphone()}-->
                            <!--    </button>-->
                            <!--{/if}-->
                            <div class="h-[1px] w-full bg-white/10 my-4" />
                            {#if $inviteUserActivated}
                                <div class="px-4 space-y-2">
                                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                                    {#each $addClassicButtonActionBarEvent as button, index (index)}
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <div
                                            class="flex flex-initial"
                                            in:fly={{}}
                                            on:dragstart|preventDefault={noDrag}
                                            on:click={() =>
                                                analyticsClient.clickOnCustomButton(button.id, button.label)}
                                            on:click={() => {
                                                buttonActionBarTrigger(button.id);
                                            }}
                                        >
                                            <button class="btn btn-light btn-sm w-full justify-center" id={button.id}>
                                                {button.label}
                                            </button>
                                        </div>
                                    {/each}
                                    {#if $inviteUserActivated}
                                        <button
                                            in:fly={{}}
                                            on:dragstart|preventDefault={noDrag}
                                            on:click={() => analyticsClient.openInvite()}
                                            on:click={() => showMenuItem(SubMenusInterface.invite)}
                                            class="btn btn-sm w-full justify-center {!$userIsConnected && ENABLE_OPENID
                                                ? 'btn-ghost btn-light'
                                                : 'btn-secondary'}"
                                        >
                                            {$LL.menu.sub.invite()}
                                        </button>
                                    {/if}
                                    {#if !$userIsConnected && ENABLE_OPENID}
                                        <a
                                            href="/login"
                                            on:click={() => analyticsClient.login()}
                                            class="btn btn-secondary btn-sm w-full justify-center"
                                        >
                                            {$LL.actionbar.login()}
                                        </a>
                                    {:else}
                                        <button
                                            on:click={() => analyticsClient.logout()}
                                            on:click={() => connectionManager.logout()}
                                            class="btn btn-secondary btn-sm w-full justify-center"
                                        >
                                            {$LL.menu.profile.logout()}
                                        </button>
                                    {/if}
                                </div>
                            {/if}
                            {#if $addActionButtonActionBarEvent.length > 0}
                                {#each $addActionButtonActionBarEvent as button, index (index)}
                                    <div class="px-4">
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <div
                                            in:fly={{}}
                                            on:dragstart|preventDefault={noDrag}
                                            on:click={() =>
                                                analyticsClient.clickOnCustomButton(
                                                    button.id,
                                                    undefined,
                                                    button.toolTip,
                                                    button.imageSrc
                                                )}
                                            on:click={() => {
                                                buttonActionBarTrigger(button.id);
                                            }}
                                            class="flex items-center justify-center btn btn-ghost btn-sm btn-light rounded select-none cursor-pointer"
                                        >
                                            <img
                                                draggable="false"
                                                src={button.imageSrc}
                                                alt={button.toolTip}
                                                class="h-6 mr-2 cursor-pointer"
                                            />
                                            {button.toolTip}
                                            <!-- src="./static/images/Workadventure.gif"   src={button.imageSrc}   -->
                                        </div>
                                    </div>
                                {/each}
                            {/if}
                        </div>
                    {/if}
                </div>
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
