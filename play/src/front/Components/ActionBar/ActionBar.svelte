<script lang="ts">
    import { get } from "svelte/store";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { clickOutside } from "svelte-outside";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import { silentStore, enableCameraSceneVisibilityStore, availabilityStatusStore } from "../../Stores/MediaStore";

    import HelpTooltip from "../Tooltip/HelpTooltip.svelte";

    import { gameManager } from "../../Phaser/Game/GameManager";
    import { currentPlayerGroupLockStateStore } from "../../Stores/CurrentPlayerGroupStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { chatVisibilityStore } from "../../Stores/ChatStore";
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
        SubMenusInterface,
        MenuKeys,
        subMenusStore,
        userIsConnected,
        backOfficeMenuVisibleStore,
        globalMessageVisibleStore,
        mapMenuVisibleStore,
        openedMenuStore,
    } from "../../Stores/MenuStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import { bottomActionBarVisibilityStore } from "../../Stores/BottomActionBarStore";
    import { iframeListener } from "../../Api/IframeListener";
    import { peerStore } from "../../Stores/PeerStore";
    import {
        modalIframeStore,
        modalVisibilityStore,
        showModalGlobalComminucationVisibilityStore,
    } from "../../Stores/ModalStore";
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
    import LockIcon from "../Icons/LockIcon.svelte";
    import LockOpenIcon from "../Icons/LockOpenIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import ProfilIcon from "../Icons/ProfilIcon.svelte";
    import CamSettingsIcon from "../Icons/CamSettingsIcon.svelte";
    import SettingsIcon from "../Icons/SettingsIcon.svelte";
    import ChevronUpIcon from "../Icons/ChevronUpIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import MenuBurgerIcon from "../Icons/MenuBurgerIcon.svelte";
    import { focusMode, rightMode, hideMode, highlightFullScreen } from "../../Stores/ActionsCamStore";
    import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    import { connectionManager } from "../../Connection/ConnectionManager";

    import { AddButtonActionBarEvent } from "../../Api/Events/Ui/ButtonActionBarEvent";
    import { getColorHexOfStatus, getStatusInformation, getStatusLabel } from "../../Utils/AvailabilityStatus";
    import { RequestedStatus } from "../../Rules/StatusRules/statusRules";
    import { audioManagerVisibilityStore } from "../../Stores/AudioManagerStore";
    import ExternalComponents from "../ExternalModules/ExternalComponents.svelte";
    import ActionBarIconButton from "./ActionBarIconButton.svelte";
    import MapSubMenu from "./MenuIcons/MapSubMenu.svelte";
    import ActionBarButtonWrapper from "./ActionBarButtonWrapper.svelte";
    import MediaSettingsList from "./MediaSettingsList.svelte";
    import AvailabilityStatusList from "./AvailabilityStatus/AvailabilityStatusList.svelte";
    import EmojiMenuItem from "./MenuIcons/EmojiMenuItem.svelte";
    import CameraMenuItem from "./MenuIcons/CameraMenuItem.svelte";
    import MicrophoneMenuItem from "./MenuIcons/MicrophoneMenuItem.svelte";
    import ScreenSharingMenuItem from "./MenuIcons/ScreenSharingMenuItem.svelte";
    import ChatMenuItem from "./MenuIcons/ChatMenuItem.svelte";
    import UserListMenuItem from "./MenuIcons/UserListMenuItem.svelte";
    import MusicMenuItem from "./MenuIcons/MusicMenuItem.svelte";
    import AppsMenuItem from "./MenuIcons/AppsMenuItem.svelte";
    import FollowMenuItem from "./MenuIcons/FollowMenuItem.svelte";
    import { IconArrowDown, IconLogout } from "@wa-icons";
    //import ChangeLayoutMenuItem from "./MenuIcons/ChangeLayoutMenuItem.svelte";

    // gameManager.currenwStartedRoom?.miniLogo ?? WorkAdventureImg;
    let userName = gameManager.getPlayerName() || "";
    export const className = "";
    //let microphoneActive = false;
    let mediaSettingsDisplayed = false;
    let helpActive: string | undefined = undefined;
    let navigating = false;
    let camMenuIsDropped = false;
    let smallArrowVisible = true;
    //const sound = new Audio("/resources/objects/webrtc-out-button.mp3");

    const gameScene = gameManager.getCurrentGameScene();
    const showChatButton = gameScene.room.isChatOnlineListEnabled;
    const showUserListButton = gameScene.room.isChatDisconnectedListEnabled;

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

    function lockClick() {
        gameManager.getCurrentGameScene().connection?.emitLockGroup(!$currentPlayerGroupLockStateStore);
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

    // FIXME: the code below was stopping the map editor when going in small screen
    /*const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
        if (isMobile) {
            mapEditorModeStore.set(false);
        }
    });*/

    function screenSharingClick(): void {
        analyticsClient.screenSharing();
        if ($silentStore) return;
        if ($requestedScreenSharingState === true) {
            requestedScreenSharingState.disableScreenSharing();
        } else {
            requestedScreenSharingState.enableScreenSharing();
        }
    }

    const statusToShow: Array<RequestedStatus | AvailabilityStatus.ONLINE> = [
        AvailabilityStatus.ONLINE,
        AvailabilityStatus.BUSY,
        AvailabilityStatus.BACK_IN_A_MOMENT,
        AvailabilityStatus.DO_NOT_DISTURB,
    ];
</script>

<div
    class="@container/actions w-full z-[301] transition-all pointer-events-none bp-menu {$peerStore.size > 0 &&
    $highlightFullScreen
        ? 'hidden'
        : ''}"
>
    <div class="flex w-full p-2 space-x-2 @xl/actions:p-4 @xl/actions:space-x-4 screen-blocker">
        <div class="justify-start flex-1 w-32">
            {#if showChatButton || showUserListButton}
                <div
                    class="flex relative transition-all duration-150 z-[2] {$chatVisibilityStore ? 'hidden' : ''}"
                    class:opacity-0={$chatVisibilityStore}
                    data-testid="chat-action"
                >
                    {#if showChatButton}
                        <ChatMenuItem />
                    {/if}
                    {#if showUserListButton}
                        <UserListMenuItem />
                    {/if}
                </div>
            {/if}
        </div>
        <div
            class="@xxs/actions:justify-center justify-end main-action pointer-events-auto min-w-32 @sm/actions:min-w-[192px]"
        >
            <div class="flex justify-center relative space-x-0 @md/actions:space-x-2 @xl/actions:space-x-4">
                <div>
                    <div class="flex items-center">
                        {#if $audioManagerVisibilityStore !== "hidden" && !$silentStore}
                            <MusicMenuItem />
                        {/if}

                        <EmojiMenuItem />
                        <AppsMenuItem />

                        {#if $bottomActionBarVisibilityStore}
                            <!-- <ChangeLayoutMenuItem /> -->

                            <FollowMenuItem />
                            <ActionBarButtonWrapper classList="group/btn-lock">
                                <ActionBarIconButton
                                    on:click={() => {
                                        analyticsClient.lockDiscussion();
                                        lockClick();
                                    }}
                                    tooltipTitle={$LL.actionbar.help.lock.title()}
                                    tooltipDesc={$LL.actionbar.help.lock.desc()}
                                    disabledHelp={$openedMenuStore !== undefined}
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

                <div>
                    <!-- ACTION WRAPPER : CAM & MIC -->
                    <div class="group/hardware flex items-center relative">
                        {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore && $myMicrophoneStore}
                            <MicrophoneMenuItem />
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
                            <CameraMenuItem />
                        {/if}
                        <!-- NAV : CAMERA END -->

                        <!-- NAV : SCREENSHARING START -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        {#if $bottomActionBarVisibilityStore}
                            <ScreenSharingMenuItem />

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
                >
                    <div
                        class="group bg-contrast/80 backdrop-blur rounded-lg h-16 @sm/actions:h-14 @xl/actions:h-16 p-2"
                        on:click|preventDefault={() => {
                            openedMenuStore.toggle("profileMenu");
                        }}
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
                                    classList="transition-all opacity-50 {$openedMenuStore === 'profileMenu'
                                        ? 'rotate-180'
                                        : ''}"
                                    height="h-4"
                                    width="w-4"
                                />
                            </div>
                        </div>
                    </div>
                    {#if $openedMenuStore === "profileMenu"}
                        <div
                            class="absolute mt-2 top-14 @xl/actions:top-16 bg-contrast/80 backdrop-blur rounded-md p-1 w-56 right-0 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-transparent before:border-b-contrast/80 transition-all hidden @md/actions:block max-h-[calc(100vh-96px)] overflow-y-auto"
                            data-testid="profile-menu"
                            transition:fly={{ y: 40, duration: 150 }}
                            use:clickOutside={() => {
                                openedMenuStore.close("profileMenu");
                            }}
                        >
                            <div class="p-0 m-0 list-none">
                                <ExternalComponents zone="menuTop" />
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
                                <!--                                <button-->
                                <!--                                    class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm w-full pointer-events-auto text-left rounded"-->
                                <!--                                >-->
                                <!--                                    <div-->
                                <!--                                        class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center"-->
                                <!--                                    >-->
                                <!--                                        <AchievementIcon />-->
                                <!--                                    </div>-->
                                <!--                                    <div class="text-left flex items-center">{$LL.actionbar.quest()}</div>-->
                                <!--                                </button>-->
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
                                    on:click={() => openedMenuStore.close("profileMenu")}
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

                                {#if ENABLE_OPENID && $userIsConnected}
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
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
                <div
                    use:clickOutside={() => {
                        openedMenuStore.close("burgerMenu");
                    }}
                >
                    <ActionBarButtonWrapper classList="group/btn-burger @lg:hidden rounded-r-lg pr-2">
                        <ActionBarIconButton
                            dataTestId="burger-menu"
                            on:click={() => {
                                openedMenuStore.toggle("burgerMenu");
                            }}
                            on:blur={() => {
                                openedMenuStore.close("burgerMenu");
                            }}
                        >
                            {#if $openedMenuStore !== "burgerMenu"}
                                <!-- pointer-events-none is important for clickOutside to work. Otherwise, the
                                     SVG is the target of the click, is removed from the DOM on click and considered to be
                                     outside the main div -->
                                <MenuBurgerIcon classList="pointer-events-none" />
                            {:else}
                                <XIcon classList="pointer-events-none" />
                            {/if}
                        </ActionBarIconButton>
                    </ActionBarButtonWrapper>
                    {#if $openedMenuStore === "burgerMenu"}
                        <div
                            class="mobile:bottom-16 w-48 bg-contrast/80 absolute right-2 top-auto z-[1000] py-4 rounded-lg text-right text-white no-underline pointer-events-auto block @lg:hidden before:content-[''] before:absolute before:w-0 before:h-0 sm:before:-top-[14px] sm:before:bottom-auto before:-bottom-4 before:top-auto before:rotate-180 sm:before:rotate-0 before:right-5 before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all"
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
                                <!-- <button class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold">
                                    {$LL.actionbar.quest()}
                                </button> -->
                                <button
                                    class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                    on:click={openEnableCameraScene}
                                >
                                    {$LL.actionbar.editCamMic()}
                                </button>
                                <button
                                    class="px-4 py-2 hover:bg-white/10 w-full justify-end text-right bold"
                                    on:click={() => showMenuItem(SubMenusInterface.settings)}
                                    on:click={() => openedMenuStore.close("burgerMenu")}
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
                                    {#if ENABLE_OPENID}
                                        {#if !$userIsConnected}
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
