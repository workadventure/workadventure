<script lang="ts">
    import { get, writable } from "svelte/store";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import {
        cameraListStore,
        microphoneListStore,
        requestedCameraDeviceIdStore,
        requestedCameraState,
        requestedMicrophoneDeviceIdStore,
        requestedMicrophoneState,
        silentStore,
        speakerListStore,
        speakerSelectedStore,
        streamingMegaphoneStore,
        usedCameraDeviceIdStore,
        usedMicrophoneDeviceIdStore,
        enableCameraSceneVisibilityStore,
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
        mapEditorActivated,
        userIsConnected,
        mapManagerActivated,
        screenSharingActivatedStore,
    } from "../../Stores/MenuStore";
    import {
        emoteDataStore,
        emoteDataStoreLoading,
        emoteMenuStore,
        emoteMenuSubCurrentEmojiSelectedStore,
        emoteMenuSubStore,
        emoteStore,
    } from "../../Stores/EmoteStore";
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
    import { userHasAccessToBackOfficeStore } from "../../Stores/GameStore";
    import { AddButtonActionBarEvent } from "../../Api/Events/Ui/ButtonActionBarEvent";
    import { Emoji } from "../../Stores/Utils/emojiSchema";
    import {
        liveStreamingEnabledStore,
        megaphoneCanBeUsedStore,
        requestedMegaphoneStore,
    } from "../../Stores/MegaphoneStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
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
    import AdminPanIcon from "../Icons/AdminPanIcon.svelte";
    import CamOffIcon from "../Icons/CamOffIcon.svelte";
    import CamOnIcon from "../Icons/CamOnIcon.svelte";
    import FollowIcon from "../Icons/FollowIcon.svelte";
    import LockIcon from "../Icons/LockIcon.svelte";
    import LockOpenIcon from "../Icons/LockOpenIcon.svelte";
    import MicOffIcon from "../Icons/MicOffIcon.svelte";
    import MicOnIcon from "../Icons/MicOnIcon.svelte";
    import ScreenShareOffIcon from "../Icons/ScreenShareOffIcon.svelte";
    import ScreenShareIcon from "../Icons/ScreenShareIcon.svelte";
    import AdjustmentsIcon from "../Icons/AdjustmentsIcon.svelte";
    import MessageGlobalIcon from "../Icons/MessageGlobalIcon.svelte";
    import MegaphoneIcon from "../Icons/MegaphoneIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import ProfilIcon from "../Icons/ProfilIcon.svelte";
    import AchievementIcon from "../Icons/AchievementIcon.svelte";
    import CamSettingsIcon from "../Icons/CamSettingsIcon.svelte";
    import SettingsIcon from "../Icons/SettingsIcon.svelte";
    import ChevronUpIcon from "../Icons/ChevronUpIcon.svelte";
    import CheckIcon from "../Icons/CheckIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import MenuBurgerIcon from "../Icons/MenuBurgerIcon.svelte";
    import PenIcon from "../Icons/PenIcon.svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import { focusMode, rightMode, hideMode, highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { connectionManager } from "../../Connection/ConnectionManager";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";

    import AppsIcon from "../Icons/AppsIcon.svelte";
    import MegaphoneConfirm from "./MegaphoneConfirm.svelte";
    import ActionBarIconButton from "./ActionBarIconButton.svelte";
    import { IconArrowDown, IconCheckList, IconCalendar, IconLogout } from "@wa-icons";
    import ActionBarButtonWrapper from "./ActionBarButtonWrapper.svelte";

    // gameManager.currenwStartedRoom?.miniLogo ?? WorkAdventureImg;
    let userName = gameManager.getPlayerName() || "";
    export const className = "";
    //let microphoneActive = false;
    let cameraActive = false;
    let profileMenuIsDropped = false;
    let adminMenuIsDropped = false;
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

    function screenSharingClick(): void {
        if ($silentStore) return;
        if ($requestedScreenSharingState === true) {
            requestedScreenSharingState.disableScreenSharing();
        } else {
            requestedScreenSharingState.enableScreenSharing();
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

    function microphoneClick(): void {
        if ($silentStore) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
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
        if ($emoteMenuSubStore == true) {
            emoteMenuSubStore.closeEmoteMenu();
        } else {
            emoteMenuSubStore.openEmoteMenu();
            appMenuOpened = false;
        }
    }

    function toggleGlobalMessage() {
        if ($requestedMegaphoneStore || $liveStreamingEnabledStore || $streamingMegaphoneStore) {
            analyticsClient.stopMegaphone();
            requestedMegaphoneStore.set(false);
            streamingMegaphoneStore.set(false);
            showModalGlobalComminucationVisibilityStore.set(false);
            return;
        }
        if ($showModalGlobalComminucationVisibilityStore) {
            showModalGlobalComminucationVisibilityStore.set(false);
            return;
        }

        resetChatVisibility();
        resetModalVisibility();
        mapEditorModeStore.switchMode(false);
        showModalGlobalComminucationVisibilityStore.set(true);
    }

    function toggleMapEditorMode() {
        if (isMobile) return;
        if ($mapEditorModeStore) gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        analyticsClient.toggleMapEditor(!$mapEditorModeStore);
        mapEditorModeStore.switchMode(!$mapEditorModeStore);
        isTodoListVisibleStore.set(false);
        isCalendarVisibleStore.set(false);
    }

    function clickEmoji(selected?: number) {
        //if open, in edit mode or playing mode
        if ($emoteMenuStore && selected != undefined) {
            //select place to change in emoji sub menu
            emoteMenuSubCurrentEmojiSelectedStore.set(selected);
        } else if (selected != undefined) {
            //get emoji and play it
            let emoji: Emoji | null | undefined = $emoteDataStore.get(selected);
            if (emoji == undefined) {
                return;
            }
            analyticsClient.launchEmote(emoji);
            emoteStore.set(emoji);

            //play UX animation
            focusElement(selected);
        }
    }

    function edit(): void {
        if ($emoteMenuStore) emoteMenuStore.closeEmoteMenu();
        else emoteMenuStore.openEmoteMenu();
    }

    function close(): void {
        emoteMenuStore.closeEmoteMenu();
        emoteMenuSubStore.closeEmoteMenu();
    }

    function focusElement(key: number) {
        if (!$emoteMenuSubStore) {
            return;
        }
        const name: string | undefined = $emoteDataStore.get(key)?.name;
        if (name == undefined) {
            return;
        }
        const element: HTMLElement | null = document.getElementById(`button-${name}`);
        if (element == undefined) {
            return;
        }
        element.focus();
        element.classList.add("focus");

        //blur element after ends of animation
        setTimeout(() => {
            element.blur();
            element.classList.remove("focus");
        }, 2000);
    }

    function onKeyDown(e: KeyboardEvent) {
        if ($mapEditorModeStore || $inputFormFocusStore) return;
        let key = null;
        if (e.key === "1" || e.key === "F1") {
            key = 1;
        }
        if (e.key === "2" || e.key === "F2") {
            key = 2;
        }
        if (e.key === "3" || e.key === "F3") {
            key = 3;
        }
        if (e.key === "4" || e.key === "F4") {
            key = 4;
        }
        if (e.key === "5" || e.key === "F5") {
            key = 5;
        }
        if (e.key === "6" || e.key === "F6") {
            key = 6;
        }
        if (!key) {
            return;
        }
        focusElement(key);
        clickEmoji(key);
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

    function selectCamera(deviceId: string) {
        requestedCameraDeviceIdStore.set(deviceId);
        localUserStore.setPreferredVideoInputDevice(deviceId);
        cameraActive = false;
    }

    function selectMicrophone(deviceId: string) {
        requestedMicrophoneDeviceIdStore.set(deviceId);
        localUserStore.setPreferredAudioInputDevice(deviceId);
        //microphoneActive = false;
    }

    function selectSpeaker(deviceId: string) {
        localUserStore.setSpeakerDeviceId(deviceId);
        speakerSelectedStore.set(deviceId);
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

    // function playSoundClick() {
    //     sound.play().catch((e) => console.error(e));
    // }

    const onClickOutside = () => {
        //if ($emoteMenuSubStore) emoteMenuSubStore.closeEmoteMenu();
        //if (appMenuOpened) appMenuOpened = false;
        //console.log("Trouble on click outside : it cause open and directly close emote / Appmenu");
    };

    function openAppMenu() {
        emoteMenuSubStore.closeEmoteMenu();
        appMenuOpened = !appMenuOpened;
    }
    function showRoomList() {
        resetChatVisibility();
        resetModalVisibility();

        roomListVisibilityStore.set(true);
    }
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClickOutside} on:touchend={onClickOutside} />

<div
    class="@container/actions position-responsive w-full z-[301] transition-all pointer-events-none bp-menu {$peerStore.size >
        0 && $highlightFullScreen
        ? 'hidden'
        : ''}"
>
    <div class="flex w-full p-2 space-x-2 @xl/actions:p-4 @xl/actions:space-x-4">
        <div class="justify-start flex-1 pointer-events-auto w-32">
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
                <ActionBarButtonWrapper buttonName="group/btn-users">
                    <ActionBarIconButton
                        on:click={() => {
                            toggleChat();
                            navChat.switchToUserList();
                        }}
                        tooltipTitle={$LL.actionbar.help.users.title()}
                        tooltipDesc={$LL.actionbar.help.users.desc()}
                        state={"normal"}
                        dataTestId={undefined}
                        disabledHelp={false}
                    >
                        <UsersIcon />
                    </ActionBarIconButton>
                </ActionBarButtonWrapper>
            </div>
        </div>
        <div
            class="@xxs/actions:justify-center justify-end main-action pointer-events-auto min-w-32 @sm/actions:min-w-[192px] max-w-[424px]"
        >
            <div class="flex justify-center relative space-x-0 @md/actions:space-x-2 @xl/actions:space-x-4">
                {#if !$silentStore}
                    <div>
                        <div class="flex items-center">
                            <ActionBarButtonWrapper buttonName="group/btn-emoji">
                                <ActionBarIconButton
                                    on:click={() => {
                                        toggleEmojiPicker();
                                    }}
                                    tooltipTitle={$LL.actionbar.help.emoji.title()}
                                    tooltipDesc={$LL.actionbar.help.emoji.desc()}
                                    disabledHelp={$emoteMenuSubStore}
                                    state={$emoteMenuSubStore ? "active" : "normal"}
                                    dataTestId={undefined}
                                >
                                    <EmojiIcon
                                        strokeColor={$emoteMenuSubStore
                                            ? "stroke-white fill-white"
                                            : "stroke-white fill-transparent"}
                                        hover="group-hover/btn-emoji:fill-white"
                                    />
                                </ActionBarIconButton>
                                {#if $emoteMenuSubStore}
                                    <div
                                        class="flex justify-center m-auto absolute left-0 -right-2 top-[70px] w-auto z-[500]"
                                        transition:fly={{ y: 20, duration: 150 }}
                                    >
                                        <img
                                            loading="eager"
                                            src={tooltipArrow}
                                            alt="Sub menu arrow"
                                            class="content-[''] absolute -top-1 left-0 right-0 m-auto w-2 h-1"
                                        />
                                        <div
                                            class="bottom-action-bar bg-contrast/80 transition-all backdrop-blur-md rounded-md px-1 flex flex-col items-stretch items-center pointer-events-auto justify-center m-auto bottom-6 md:bottom-4 z-[251] transition-transform duration-300 md:flex-row"
                                        >
                                            <div class="flex animate flex-row flex items-center">
                                                <div class="py-1 flex">
                                                    {#each [...$emoteDataStore.keys()] as key, index (index)}
                                                        <div class="transition-all bottom-action-button divide-x">
                                                            <button
                                                                on:click|stopPropagation|preventDefault={() => {
                                                                    clickEmoji(key);
                                                                }}
                                                                id={`button-${$emoteDataStore.get(key)?.name}`}
                                                                class="group emoji py-2 px-2 m-0 flex items-center transition-all rounded {$emoteMenuStore &&
                                                                $emoteMenuSubCurrentEmojiSelectedStore === key
                                                                    ? 'bg-secondary'
                                                                    : 'hover:bg-white/20'}"
                                                            >
                                                                <div
                                                                    class="emoji transition-all group-hover:-rotate-6 group-hover:scale-[2.5]"
                                                                    style="margin:auto"
                                                                    id={`icon-${$emoteDataStore.get(key)?.name}`}
                                                                >
                                                                    {$emoteDataStore.get(key)?.emoji}
                                                                </div>
                                                                {#if !isMobile}
                                                                    <div
                                                                        class="text-white/50 group-hover:text-white group-hover:bold font-xxs pl-1"
                                                                    >
                                                                        {key}
                                                                    </div>
                                                                {/if}
                                                            </button>
                                                        </div>
                                                    {/each}
                                                </div>
                                                <div
                                                    class="transition-all bottom-action-button flex items-center h-full pl-2 relative before:content-[''] before:absolute before:top-0 before:left-1 before:w-[1px] before:h-full before:bg-white/10"
                                                >
                                                    <button
                                                        class="btn btn-sm btn-ghost btn-light flex"
                                                        on:click={() => analyticsClient.editEmote()}
                                                        on:click|stopPropagation|preventDefault={edit}
                                                    >
                                                        {#if $emoteDataStoreLoading}
                                                            <svg
                                                                class="animate-spin h-5 w-5 text-white"
                                                                xmlns="http://www.w3.org/2000/svg"
                                                                fill="none"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <circle
                                                                    class="opacity-25"
                                                                    cx="12"
                                                                    cy="12"
                                                                    r="10"
                                                                    stroke="currentColor"
                                                                    stroke-width="4"
                                                                />
                                                                <path
                                                                    class="opacity-75"
                                                                    fill="currentColor"
                                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                                />
                                                            </svg>
                                                        {:else if !$emoteMenuStore}
                                                            <PenIcon width="w-4" height="h-4" />
                                                            <div>{$LL.actionbar.edit()}</div>
                                                        {:else}
                                                            <XIcon width="w-4" height="h-4" />
                                                            <div>{$LL.actionbar.cancel()}</div>
                                                        {/if}
                                                    </button>
                                                </div>
                                                <!--
                                                <div class="transition-all bottom-action-button flex items-center rounded-r-lg h-full ml-2">
                                                    <button
                                                            class="btn btn-sm btn-danger"
                                                            on:click|stopPropagation|preventDefault={close}
                                                    >
                                                        <XIcon width="w-4" height="h-4" />
                                                    </button>
                                                </div>
                                                -->
                                            </div>
                                        </div>
                                    </div>
                                {/if}
                            </ActionBarButtonWrapper>
                            <ActionBarButtonWrapper buttonName="group/btn-apps">
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

                                <ActionBarButtonWrapper buttonName="group/btn-follow">
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
                                <ActionBarButtonWrapper buttonName="group/btn-lock">
                                    <ActionBarIconButton
                                        on:click={() => {
                                            analyticsClient.lockDiscussion();
                                            lockClick();
                                        }}
                                        tooltipTitle={$LL.actionbar.help.lock.title()}
                                        tooltipDesc={$LL.actionbar.help.lock.desc()}
                                        disabledHelp={appMenuOpened}
                                        state={$currentPlayerGroupLockStateStore ? "forbidden" : "normal"}
                                        dataTestId={undefined}
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
                    <div
                        class="flex flex-col items-center justify-center rounded-lg bg-danger-900/50 text-white mt-12 px-6 py-4 backdrop-blur"
                    >
                        <picture class="h-8">
                            <source
                                srcset="https://fonts.gstatic.com/s/e/notoemoji/latest/1f910/512.webp"
                                type="image/webp"
                            />
                            <img
                                src="https://fonts.gstatic.com/s/e/notoemoji/latest/1f910/512.gif"
                                alt="🤐"
                                width="96"
                                height="96"
                                class="absolute left-0 right-0 m-auto -top-12"
                            />
                        </picture>
                        <div class="text-lg font-bold">{$LL.actionbar.silentTitle()}</div>
                        <p class="text-xs italic m-0 text-center opacity-80 leading-3">
                            {$LL.actionbar.silentDesc()}
                        </p>
                    </div>
                {/if}
                <div>
                    <!-- ACTION WRAPPER : CAM & MIC -->
                    <div class="group/hardware flex items-center relative">
                        {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore}
                            <!-- NAV : MICROPHONE START -->
                            {#if $myMicrophoneStore}
                                <ActionBarButtonWrapper buttonName="group/btn-mic peer/mic">
                                    <ActionBarIconButton
                                        on:click={() => {
                                            analyticsClient.microphone();
                                            microphoneClick();
                                        }}
                                        tooltipTitle={$LL.actionbar.help.mic.title()}
                                        tooltipDesc={$LL.actionbar.help.mic.desc()}
                                        disabledHelp={appMenuOpened}
                                        state={!$requestedMicrophoneState || $silentStore ? "forbidden" : "normal"}
                                        dataTestId={undefined}
                                    >
                                        {#if $requestedMicrophoneState && !$silentStore}
                                            <MicOnIcon />
                                        {:else}
                                            <MicOffIcon />
                                        {/if}
                                    </ActionBarIconButton>
                                </ActionBarButtonWrapper>
                            {/if}
                        {/if}
                        <!-- NAV : MICROPHONE END -->
                        <!--{#if $microphoneListStore.length > 1 || $cameraListStore.length > 1 || $speakerListStore.length > 0}
                        {/if}-->
                        {#if smallArrowVisible}
                            <div
                                class="absolute h-3 w-7 rounded-b bg-contrast/80 backdrop-blur left-0 right-0 m-auto p-1 z-10 opacity-0 transition-all -bottom-3 hidden sm:block {cameraActive
                                    ? 'opacity-100'
                                    : 'group-hover/hardware:opacity-100'}"
                            >
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="absolute bottom-1 left-0 right-0 m-auto hover:bg-white/10 h-5 w-5 flex items-center justify-center rounded-sm"
                                    on:click|stopPropagation|preventDefault={() => (cameraActive = !cameraActive)}
                                >
                                    <ChevronUpIcon
                                        height="h-4"
                                        width="w-4"
                                        classList="aspect-square transition-all {cameraActive ? '' : 'rotate-180'}"
                                        strokeWidth="2"
                                    />
                                </div>
                            </div>
                        {/if}
                        {#if cameraActive}
                            <div
                                class="absolute top-20 left-1/2 transform -translate-x-1/2 text-white rounded-md w-64 overflow-hidden before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:left-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-left-0 transition-all"
                                in:fly={{ y: 40, duration: 150 }}
                            >
                                <div
                                    class="flex flex-col overflow-auto space-y-2 p-1"
                                    style="max-height: calc(100vh - 160px);"
                                >
                                    {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
                                        <div class="">
                                            <div
                                                class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold"
                                            >
                                                {$LL.actionbar.subtitle.camera()}
                                            </div>
                                            {#each $cameraListStore as camera, index (index)}
                                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                <div
                                                    class="group flex items-center relative z-10 py-1 px-2 overflow-hidden rounded {$usedCameraDeviceIdStore ===
                                                    camera.deviceId
                                                        ? 'bg-secondary'
                                                        : 'hover:bg-white/10'}"
                                                    on:click={() => {
                                                        analyticsClient.selectCamera();
                                                    }}
                                                    on:click|stopPropagation|preventDefault={() =>
                                                        selectCamera(camera.deviceId)}
                                                >
                                                    <div
                                                        class="grow text-sm text-ellipsis overflow-hidden whitespace-nowrap {$usedCameraDeviceIdStore ===
                                                        camera.deviceId
                                                            ? 'opacity-100'
                                                            : 'opacity-80 group-hover:opacity-100'}"
                                                    >
                                                        {StringUtils.normalizeDeviceName(camera.label)}
                                                    </div>
                                                    {#if $usedCameraDeviceIdStore === camera.deviceId}
                                                        <CheckIcon
                                                            height="h-4"
                                                            width="w-4"
                                                            classList="aspect-square transition-all"
                                                            strokeColor="stroke-white fill-transparent {$usedCameraDeviceIdStore ===
                                                            camera.deviceId
                                                                ? 'opacity-100'
                                                                : 'opacity-0 group-hover:opacity-30'}"
                                                            strokeWidth="1.5"
                                                        />
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    {:else}
                                        <div class="">
                                            <div
                                                class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold"
                                            >
                                                {$LL.actionbar.subtitle.camera()}
                                            </div>
                                            <div
                                                class="group flex items-center relative z-10 px-2 font-sm justify-center"
                                            >
                                                <div class="text-sm italic">
                                                    {$LL.actionbar.camera.disabled()}
                                                </div>
                                            </div>
                                            <div
                                                class="group flex items-center relative z-10 py-1 px-2 overflow-hidden"
                                            >
                                                <button
                                                    class="btn btn-danger btn-sm w-full justify-center"
                                                    on:click={() => analyticsClient.camera()}
                                                    on:click={cameraClick}
                                                >
                                                    {$LL.actionbar.camera.activate()}
                                                </button>
                                            </div>
                                        </div>
                                    {/if}
                                    {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 1}
                                        <div class="">
                                            <div
                                                class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-1 relative bold"
                                            >
                                                {$LL.actionbar.subtitle.microphone()}
                                            </div>
                                            {#each $microphoneListStore as microphone, index (index)}
                                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                <div
                                                    class="group flex items-center relative z-10 py-1 px-2 overflow-hidden rounded {$usedMicrophoneDeviceIdStore ===
                                                    microphone.deviceId
                                                        ? 'bg-secondary'
                                                        : 'hover:bg-white/10'}"
                                                    on:click={() => {
                                                        analyticsClient.selectMicrophone();
                                                    }}
                                                    on:click|stopPropagation|preventDefault={() =>
                                                        selectMicrophone(microphone.deviceId)}
                                                >
                                                    <div
                                                        class="grow text-sm text-ellipsis overflow-hidden whitespace-nowrap {$usedMicrophoneDeviceIdStore ===
                                                        microphone.deviceId
                                                            ? 'opacity-100'
                                                            : 'opacity-80 group-hover:opacity-100'}"
                                                    >
                                                        {StringUtils.normalizeDeviceName(microphone.label)}
                                                    </div>
                                                    {#if $usedMicrophoneDeviceIdStore === microphone.deviceId}
                                                        <CheckIcon
                                                            height="h-4"
                                                            width="w-4"
                                                            classList="aspect-square transition-all"
                                                            strokeColor="stroke-white fill-transparent {$usedMicrophoneDeviceIdStore ===
                                                            microphone.deviceId
                                                                ? 'opacity-100'
                                                                : 'opacity-0 group-hover:opacity-30'}"
                                                            strokeWidth="1.5"
                                                        />
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    {:else}
                                        <div class="">
                                            <div
                                                class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold"
                                            >
                                                {$LL.actionbar.subtitle.microphone()}
                                            </div>
                                            <div
                                                class="group flex items-center relative z-10 py-1 px-2 font-sm justify-center"
                                            >
                                                <div class="text-sm italic">
                                                    {$LL.actionbar.microphone.disabled()}
                                                </div>
                                            </div>
                                            <div class="group flex items-center relative z-10 px-2 overflow-hidden">
                                                <button
                                                    class="btn btn-danger btn-sm w-full justify-center"
                                                    on:click={() => analyticsClient.microphone()}
                                                    on:click={microphoneClick}
                                                >
                                                    {$LL.actionbar.microphone.activate()}
                                                </button>
                                            </div>
                                        </div>
                                    {/if}
                                    {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
                                        <div class="">
                                            <div class="flex text-xxs uppercase text-white/50 px-3 py-1 relative">
                                                {$LL.actionbar.subtitle.speaker()}
                                            </div>
                                            {#each $speakerListStore as speaker, index (index)}
                                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                                <div
                                                    class="group flex items-center relative z-10 py-1 px-2 overflow-hidden rounded {$speakerSelectedStore ===
                                                    speaker.deviceId
                                                        ? 'bg-secondary'
                                                        : 'hover:bg-white/10'}"
                                                    on:click={() => {
                                                        analyticsClient.selectSpeaker();
                                                    }}
                                                    on:click|stopPropagation|preventDefault={() =>
                                                        selectSpeaker(speaker.deviceId)}
                                                >
                                                    <div
                                                        class="grow text-sm text-ellipsis overflow-hidden whitespace-nowrap {$speakerSelectedStore ===
                                                        speaker.deviceId
                                                            ? 'opacity-100'
                                                            : 'opacity-80 group-hover:opacity-100'}"
                                                    >
                                                        {StringUtils.normalizeDeviceName(speaker.label)}
                                                    </div>
                                                    {#if $speakerSelectedStore === speaker.deviceId}
                                                        <CheckIcon
                                                            height="h-4"
                                                            width="w-4"
                                                            classList="aspect-square transition-all"
                                                            strokeColor="stroke-white fill-transparent {$speakerSelectedStore ===
                                                            speaker.deviceId
                                                                ? 'opacity-100'
                                                                : 'opacity-0 group-hover:opacity-30'}"
                                                            strokeWidth="1.5"
                                                        />
                                                    {/if}
                                                </div>
                                            {/each}
                                        </div>
                                    {/if}
                                </div>
                                <div class="relative z-10 flex gap-2 p-2 bg-contrast/50">
                                    <button
                                        class="btn btn-sm btn-ghost btn-light justify-center w-full rounded"
                                        on:click={openEnableCameraScene}>{$LL.actionbar.test()}</button
                                    >
                                    <button
                                        class="btn btn-sm btn-border btn-light justify-center w-full cursor-pointer rounded"
                                        on:click|stopPropagation|preventDefault={() => (cameraActive = !cameraActive)}
                                        >{$LL.actionbar.close()}</button
                                    >
                                </div>
                            </div>
                        {/if}
                        <!-- NAV : CAMERA START -->
                        {#if !$inExternalServiceStore && $myCameraStore && !$silentStore}
                            <ActionBarButtonWrapper buttonName="group/btn-cam">
                                <ActionBarIconButton
                                    on:click={() => {
                                        analyticsClient.camera();
                                        cameraClick();
                                    }}
                                    tooltipTitle={$LL.actionbar.help.cam.title()}
                                    tooltipDesc={$LL.actionbar.help.cam.desc()}
                                    disabledHelp={appMenuOpened}
                                    state={!$requestedCameraState || $silentStore ? "forbidden" : "normal"}
                                    dataTestId={undefined}
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
                            <ActionBarButtonWrapper buttonName="group/btn-screen-share">
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
        <div id="action-wrapper" class="flex-1 justify-end pointer-events-auto">
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
                                    class="h-12 min-w-12 @sm/actions:min-w-10 @sm/actions:h-10 @xl/actions:h-12 @xl/actions:min-w-12 p-1 m-0 rounded hover:bg-white/10 flex items-center justify-center transition-all cursor-pointer"
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
                                class="flex items-center bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg"
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
                {#if ($mapEditorActivated && $mapManagerActivated) || $userHasAccessToBackOfficeStore}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        data-testid="action-admin"
                        class="items-center relative transition-all hidden @lg/actions:block"
                        on:click={() => (adminMenuIsDropped = !adminMenuIsDropped)}
                        on:click|preventDefault={close}
                        on:blur={() => (adminMenuIsDropped = false)}
                    >
                        <div
                            class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2 transition-all"
                        >
                            <div
                                class="flex items-center h-full group-hover:bg-white/10 transition-all group-hover:rounded space-x-2 pl-4 pr-3"
                            >
                                <AdminPanIcon />
                                <div class="pr-2">
                                    <div
                                        class="font-bold text-white leading-3 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base"
                                    >
                                        {$LL.actionbar.admin()}
                                    </div>
                                </div>
                                <ChevronDownIcon
                                    strokeWidth="2"
                                    classList="h-4 w-4 aspect-square transition-all opacity-50 {adminMenuIsDropped
                                        ? 'rotate-180'
                                        : ''}"
                                    height="16px"
                                    width="16px"
                                />
                            </div>
                        </div>
                        {#if adminMenuIsDropped}
                            <div
                                class="absolute mt-2 top-14 @xl/actions:top-16 right-0 bg-contrast/80 backdrop-blur rounded-md w-56 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-transparent before:border-b-contrast/80 transition-all"
                                data-testid="admin-menu"
                                transition:fly={{ y: 40, duration: 150 }}
                            >
                                <ul class="p-1 m-0">
                                    {#if $mapEditorActivated && $mapManagerActivated}
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <li
                                            class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                            data-testid="map-editor"
                                            on:click={() => toggleMapEditorMode()}
                                        >
                                            <div class="transition-all w-6 h-6 aspect-square text-center">
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 20 20"
                                                    fill="none"
                                                    xmlns="http://www.w3.org/2000/svg"
                                                >
                                                    <path
                                                        d="M12.5 3.5L16.5 7.5M10 6L5 1L1 5L6 10M5 6L3.5 7.5M14 10L19 15L15 19L10 14M14 15L12.5 16.5M1 19H5L18 6C18.5304 5.46957 18.8284 4.75015 18.8284 4C18.8284 3.24985 18.5304 2.53043 18 2C17.4696 1.46957 16.7501 1.17157 16 1.17157C15.2499 1.17157 14.5304 1.46957 14 2L1 15V19Z"
                                                        stroke="white"
                                                        stroke-width="2"
                                                        stroke-linecap="round"
                                                        stroke-linejoin="round"
                                                    />
                                                </svg>
                                                <!-- TODO Hugo : SVG inline -->
                                            </div>
                                            <div>{$LL.actionbar.mapEditor()}</div>
                                        </li>
                                    {/if}
                                    {#if $userHasAccessToBackOfficeStore}
                                        <li
                                            class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                            on:click={() => openBo()}
                                        >
                                            <div class="transition-all w-6 h-6 aspect-square text-center">
                                                <AdjustmentsIcon />
                                            </div>
                                            <div>{$LL.actionbar.bo()}</div>
                                        </li>
                                    {/if}
                                    <li
                                        class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                        data-testid="global-message"
                                        on:click={toggleGlobalMessage}
                                    >
                                        <div class="transition-all w-6 h-6 aspect-square text-center">
                                            <MessageGlobalIcon />
                                        </div>
                                        <div>{$LL.actionbar.globalMessage()}</div>
                                    </li>
                                    {#if $megaphoneCanBeUsedStore && !$silentStore && ($myMicrophoneStore || $myCameraStore)}
                                        <li
                                            class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"
                                        >
                                            <div
                                                class="transition-all w-6 h-6 aspect-square text-center"
                                                data-testid="megaphone"
                                            >
                                                <MegaphoneIcon />
                                            </div>
                                            <div>{$LL.actionbar.megaphone()}</div>
                                        </li>
                                    {/if}
                                </ul>
                                {#if $streamingMegaphoneStore}
                                    <MegaphoneConfirm />
                                {/if}
                            </div>
                        {/if}
                    </div>
                {/if}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    data-testid="action-user"
                    class="flex items-center relative transition-all hidden @md/actions:flex"
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
                                    <div class="aspect-square h-2 w-2 bg-success rounded-full mr-1.5" />
                                    <div class="text-success hidden @xl/actions:block">
                                        {$LL.actionbar.status.ONLINE()}
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
                                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold">
                                    Status
                                </div>
                                <button
                                    class="group flex px-4 py-1 gap-2 items-center transition-all cursor-pointer text-sm w-full pointer-events-auto text-left rounded"
                                >
                                    <div class="aspect-square h-2 w-2 bg-success rounded-full" />
                                    <div class="grow text-left opacity-50 leading-4">En ligne</div>
                                    <CheckIcon height="h-4" width="h-4" classList="opacity-100" />
                                </button>
                                <button
                                    class="group flex px-2 py-1 gap-2 items-center transition-all cursor-pointer text-sm w-full pointer-events-auto text-left rounded"
                                >
                                    <div class="aspect-square h-2 w-2 bg-warning rounded-full leading-4" />
                                    <div class="grow text-left leading-4">Absent</div>
                                    <CheckIcon
                                        height="h-4"
                                        width="h-4"
                                        classList="opacity-0 group-hover:opacity-100 transition-all"
                                    />
                                </button>
                                <button
                                    class="group flex px-2 py-1 gap-4 items-center transition-all cursor-pointer text-sm w-full pointer-events-auto text-left rounded"
                                >
                                    <div class="aspect-square h-2 w-2 bg-danger-500 rounded-full leading-4" />
                                    <div class="grow text-left leading-4">Ne pas déranger</div>
                                    <CheckIcon
                                        height="h-4"
                                        width="h-4"
                                        classList="opacity-0 group-hover:opacity-100 transition-all"
                                    />
                                </button>
                                <div class="flex text-xxs uppercase text-white/50 px-2 pb-0.5 pt-2 relative bold">
                                    Profil
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
                                            class="stroke-danger-600 group-hover:stroke-white"
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
                <div
                    class="group/btn-burger relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 rounded-l-lg rounded-r-lg aspect-square block @lg:hidden"
                >
                    <button
                        on:click={() => (burgerOpen = !burgerOpen)}
                        on:blur={() => (burgerOpen = false)}
                        on:click|preventDefault={close}
                        class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:w-12 @xl/actions:w-12 p-1 m-0 rounded hover:bg-white/10 flex items-center justify-center transition-all"
                    >
                        {#if !burgerOpen}
                            <MenuBurgerIcon />
                        {:else}
                            <XIcon />
                        {/if}
                    </button>
                </div>
            </div>
        </div>
    </div>
    {#if burgerOpen}
        <div
            class="w-48 bg-contrast/80 absolute right-2 top-auto z-[1000] py-4 rounded-lg text-right text-white no-underline pointer-events-auto block @lg:hidden before:content-[''] before:absolute before:w-0 before:h-0 sm:before:-top-[14px] sm:before:bottom-auto before:-bottom-4 before:top-auto before:rotate-180 sm:before:rotate-0 before:right-5 before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all"
            transition:fly={{ y: 40, duration: 150 }}
        >
            <div class="block @md/actions:hidden">
                <div class="flex text-xxs uppercase text-white/50 px-4 py-2 relative justify-end">Your profil</div>

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
                    <div class="flex text-xxs uppercase text-white/50 px-4 py-2 relative justify-end">Camera</div>

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
            <div class="h-[1px] w-full bg-white/10 my-2 block @md/actions:hidden" />
            <div class="flex text-xxs uppercase text-white/50 px-4 py-2 relative justify-end">Administrator</div>
            <button class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold" on:click={() => openBo()}>
                {$LL.actionbar.bo()}
            </button>
            <button class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold">
                {$LL.actionbar.globalMessage()}
            </button>
            {#if $megaphoneCanBeUsedStore && !$silentStore && ($myMicrophoneStore || $myCameraStore)}
                <button class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold">
                    {$LL.actionbar.megaphone()}
                </button>
            {/if}
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
                            on:click={() => analyticsClient.clickOnCustomButton(button.id, button.label)}
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

<style lang="scss">
    @import "../../style/breakpoints.scss";
</style>
