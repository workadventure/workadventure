<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { get, writable } from "svelte/store";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import {
        cameraListStore,
        microphoneListStore,
        speakerListStore,
        requestedCameraState,
        requestedMicrophoneState,
        requestedCameraDeviceIdStore,
        requestedMicrophoneDeviceIdStore,
        usedCameraDeviceIdStore,
        usedMicrophoneDeviceIdStore,
        silentStore,
        speakerSelectedStore,
        streamingMegaphoneStore,
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
    import {
        proximityMeetingStore,
        inExternalServiceStore,
        myCameraStore,
        myMicrophoneStore,
    } from "../../Stores/MyMediaStore";
    import {
        activeSubMenuStore,
        menuVisiblilityStore,
        inviteUserActivated,
        SubMenusInterface,
        MenuKeys,
        subMenusStore,
        additionnalButtonsMenu,
        addClassicButtonActionBarEvent,
        addActionButtonActionBarEvent,
        mapEditorActivated,
        userIsConnected,
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
        showModalGlobalComminucationVisibilityStore,
    } from "../../Stores/ModalStore";
    import { userHasAccessToBackOfficeStore } from "../../Stores/GameStore";
    import { AddButtonActionBarEvent } from "../../Api/Events/Ui/ButtonActionBarEvent";
    import { Emoji } from "../../Stores/Utils/emojiSchema";
    import { megaphoneCanBeUsedStore } from "../../Stores/MegaphoneStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { ADMIN_URL, ENABLE_OPENID } from "../../Enum/EnvironmentVariable";
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
    import ChatOverlay from "../Chat/ChatOverlay.svelte";
    import ChevronUpIcon from "../Icons/ChevronUpIcon.svelte";
    import CheckIcon from "../Icons/CheckIcon.svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import MenuBurgerIcon from "../Icons/MenuBurgerIcon.svelte";
    import PenIcon from "../Icons/PenIcon.svelte";
    import { StringUtils } from "../../Utils/StringUtils";
    import MegaphoneConfirm from "./MegaphoneConfirm.svelte";
    import { focusMode, rightMode, hideMode } from "../../Stores/ActionsCamStore";

    // gameManager.currentStartedRoom?.miniLogo ?? WorkAdventureImg;
    let userName = gameManager.getPlayerName() || "";

    let microphoneActive = false;
    let cameraActive = false;
    let profileMenuIsDropped = false;
    let adminMenuIsDropped = false;
    let burgerOpen = false;
    let helpActive: string | undefined = undefined;
    let navigating = false;
    let camMenuIsDropped = false;
    const sound = new Audio("/resources/objects/webrtc-out-button.mp3");

    function focusModeOn() {
        focusMode.set(!get(focusMode));
        console.log("focusMode", focusMode);
    }

    function rightModeOn() {
        rightMode.set(!get(rightMode));
        console.log("rightMode", rightMode);
    }

    function lightModeOn() {
        console.log("Je suis dans la fonction lightModeOn pour le focusMode");
        focusMode.set(true);
        console.log("focusMode", focusMode);
    }

    function hideModeOn() {
        hideMode.set(!get(hideMode));
        console.log("hideMode", hideMode);
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
            // layoutManagerActionStore.removeAction("megaphoneNeedCameraOrMicrophone"); Voir avec Hugo
        }
    }

    function microphoneClick(): void {
        if ($silentStore) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
            // layoutManagerActionStore.removeAction("megaphoneNeedCameraOrMicrophone"); Voir avec Hugo
        }
    }

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

    /*
    TODO Hugo
    function getStatus() {
        switch ($availabilityStatusStore) {
            case 1:
                return "Online";
            case 2:
                return "Away";
            default:
                return "Do not disturb";
        }
    }

     */

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
        }
    }

    // function toggleGlobalMessage() { // eslint-disable-line @typescript-eslint/no-unused-vars
    //     if ($requestedMegaphoneStore || $liveStreamingEnabledStore || $streamingMegaphoneStore) {
    //         analyticsClient.stopMegaphone();
    //         requestedMegaphoneStore.set(false);
    //         streamingMegaphoneStore.set(false);
    //         showModalGlobalComminucationVisibilityStore.set(false);
    //         return;
    //     }
    //     if ($showModalGlobalComminucationVisibilityStore) {
    //         showModalGlobalComminucationVisibilityStore.set(false);
    //         return;
    //     }

    //     resetChatVisibility();
    //     resetModalVisibility();
    //     mapEditorModeStore.switchMode(false);
    //     showModalGlobalComminucationVisibilityStore.set(true);
    // }

    function toggleMapEditorMode() {
        if (isMobile) return;
        if ($mapEditorModeStore) gameManager.getCurrentGameScene().getMapEditorModeManager().equipTool(undefined);
        analyticsClient.toggleMapEditor(!$mapEditorModeStore);
        mapEditorModeStore.switchMode(!$mapEditorModeStore);
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
        window.open(ADMIN_URL, "_blank");
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
        console.log("Hey companion");
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

    function noDrag() {
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
        microphoneActive = false;
    }

    function selectSpeaker(deviceId: string) {
        localUserStore.setSpeakerDeviceId(deviceId);
        speakerSelectedStore.set(deviceId);
    }

    let subscribers = new Array<Unsubscriber>();
    let totalMessagesToSee = writable<number>(0);
    onMount(() => {
        //eslint-disable-next-line rxjs/no-ignored-subscription, svelte/no-ignored-unsubscribe
        iframeListener.chatTotalMessagesToSeeStream.subscribe((total) => totalMessagesToSee.set(total));
        //resizeObserver.observe(mainHtmlDiv);
        sound.load();
    });

    onDestroy(() => {
        // subscribers.map((subscriber) => subscriber());
        subscribers.forEach((subscriber) => subscriber());
        // unsubscribechatTotalMessagesToSeeStream?.unsubscribe();
        //chatTotalMessagesSubscription?.unsubscribe();
    });

    function buttonActionBarTrigger(id: string) {
        const button = $additionnalButtonsMenu.get(id) as AddButtonActionBarEvent;
        return iframeListener.sendButtonActionBarTriggered(button);
    }

    let isMobile = isMediaBreakpointUp("md");
    new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
        if (isMobile) {
            mapEditorModeStore.set(false);
        }
    });

    // function playSoundClick() {
    //     sound.play().catch((e) => console.error(e));
    // }

    /*
    TODO Hugo : Add Room list
    function playSoundClick() {
      sound.play().catch(e => console.error(e));
    }


    // function showRoomList() {
    //     resetChatVisibility();
    //     resetModalVisibility();
    //     roomListVisibilityStore.set(true);
    // }


    // on:mouseenter={() => { if (!navigating) helpActive = !!"chat"; }}
    // on:mouseleave={() => { !navigating ? helpActive = false : '' }}

     */
</script>

<svelte:window on:keydown={onKeyDown} />
{#if !$chatVisibilityStore}
    <ChatOverlay />
{/if}
<div class="@container/actions w-full z-[301] bottom-0 sm:top-0 transition-all pointer-events-none bp-menu">
    <div class="flex w-full p-2 space-x-2 @xl/actions:p-4 @xl/actions:space-x-4">
        <div
            class="justify-start flex-1 pointer-events-auto w-32"
            transition:fly={{ delay: 500, y: -200, duration: 750 }}
        >
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <div class="flex relative transition-all duration-150 z-[2]" class:opacity-0={$chatVisibilityStore}>
                <div
                    class="group/btn-message-circle relative bg-contrast/80 transition-all backdrop-blur first:rounded-l-lg rounded-r-lg sm:rounded-r-none p-2 aspect-square"
                    on:click={() => analyticsClient.openedChat()}
                    on:click={toggleChat}
                    on:mouseenter={() => {
                        !navigating ? (helpActive = "chat") : "";
                    }}
                    on:mouseleave={() => {
                        !navigating ? (helpActive = undefined) : "";
                    }}
                >
                    <div
                        class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 rounded group-hover/btn-message-circle:bg-white/10 aspect-square flex items-center justify-center transition-all"
                    >
                        <MessageCircleIcon />
                    </div>

                    {#if helpActive === "chat"}
                        <HelpTooltip title={$LL.actionbar.help.chat.title()} desc={$LL.actionbar.help.chat.desc()} />
                    {/if}
                    {#if $chatZoneLiveStore || $peerStore.size > 0}
                        <div>
                            <span
                                class="w-4 h-4 block rounded-full absolute -top-1 -left-1 animate-ping {$peerStore.size >
                                0
                                    ? 'bg-success'
                                    : 'bg-danger'}"
                            />
                            <span
                                class="w-3 h-3 block rounded-full absolute -top-0.5 -left-0.5 {$peerStore.size > 0
                                    ? 'bg-success'
                                    : 'bg-danger'}"
                            />
                        </div>
                    {:else if $totalMessagesToSee > 0}
                        <div
                            class="absolute -top-2 -left-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full z-10"
                        >
                            {$totalMessagesToSee}
                        </div>
                    {/if}
                </div>

                <div
                    class="group/btn-users relative bg-contrast/80 transition-all backdrop-blur first:rounded-l-lg last:rounded-r-lg p-2 p-2 aspect-square hidden sm:block"
                    on:click={toggleChat}
                >
                    <div
                        class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 rounded group-hover/btn-users:bg-white/10 aspect-square flex items-center justify-center transition-all"
                        on:mouseenter={() => {
                            !navigating ? (helpActive = "users") : "";
                        }}
                        on:mouseleave={() => {
                            !navigating ? (helpActive = undefined) : "";
                        }}
                    >
                        <UsersIcon />
                    </div>
                    {#if helpActive === "users"}
                        <HelpTooltip title={$LL.actionbar.help.users.title()} desc={$LL.actionbar.help.users.desc()} />
                    {/if}
                </div>
            </div>
        </div>
        <div
            class="@xxs/actions:justify-center justify-end main-action justify-center pointer-events-auto min-w-32 @sm/actions:min-w-[192px] max-w-[424px]"
        >
            <div class="flex justify-center relative space-x-0 @sm/actions:space-x-2 @xl/actions:space-x-4">
                {#if !$silentStore}
                    <div in:fly={{ delay: 750, y: -200, duration: 750 }}>
                        <div class="flex items-center">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class="group/btn-emoji bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg aspect-square hidden sm:block"
                                on:click={toggleEmojiPicker}
                                on:click={(helpActive = undefined)}
                                on:mouseenter={() => {
                                    !navigating ? (helpActive = "emoji") : "";
                                }}
                                on:mouseleave={() => {
                                    !navigating ? (helpActive = undefined) : "";
                                }}
                            >
                                <div
                                    class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 rounded aspect-square flex items-center justify-center transition-all {$emoteMenuSubStore
                                        ? 'bg-secondary group-hover/bg-secondary-600'
                                        : ' group-hover/btn-emoji:bg-white/10'}"
                                >
                                    <EmojiIcon
                                        strokeColor={$emoteMenuSubStore
                                            ? "stroke-white fill-white"
                                            : "stroke-white fill-transparent"}
                                        hover="group-hover/btn-emoji:fill-white"
                                    />
                                </div>
                                {#if helpActive === "emoji" && !$emoteMenuSubStore}
                                    <HelpTooltip
                                        title={$LL.actionbar.help.emoji.title()}
                                        desc={$LL.actionbar.help.emoji.desc()}
                                    />
                                {/if}
                                {#if $emoteMenuSubStore}
                                    <div
                                        class="flex justify-center m-auto absolute left-0 right-0 top-[70px] w-auto z-[500]"
                                        transition:fly={{ y: 20, duration: 150 }}
                                    >
                                        <img
                                            loading="eager"
                                            src={tooltipArrow}
                                            alt="Sub menu arrow"
                                            class="content-[''] absolute -top-1 left-0 right-0 m-auto w-2 h-1"
                                        />
                                        <div
                                            class="bottom-action-bar bg-contrast/80 transition-all backdrop-blur rounded-lg px-3 flex flex-col items-stretch items-center pointer-events-auto justify-center m-auto bottom-6 md:bottom-4 z-[251] transition-transform duration-300 sm:flex-row"
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
                                                                class="group emoji py-2 px-2 block m-0 rounded-none flex items-center transition-all rounded-sm {$emoteMenuStore &&
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
                                                    class="transition-all bottom-action-button flex items-center h-full pl-4 relative before:content-[''] before:absolute before:top-0 before:left-1 before:w-[1px] before:h-full before:bg-white/10"
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
                            </div>
                            {#if $bottomActionBarVisibilityStore}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="group/btn-layout bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg  aspect-square hidden sm:block"
                                >
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
                                </div>
                                <div
                                    class="group/btn-follow bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 rounded-l-lg sm:rounded-l-none sm:first:rounded-l-lg sm:last:rounded-r-lg  aspect-square"
                                >
                                    <div
                                        class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 rounded group-hover/btn-follow:bg-white/10 aspect-square flex items-center justify-center transition-all {$followStateStore ===
                                        'active'
                                            ? 'bg-secondary'
                                            : ''}"
                                        class:disabled={$followStateStore !== "off"}
                                        on:click={() => analyticsClient.follow()}
                                        on:click={followClick}
                                        on:mouseenter={() => {
                                            !navigating ? (helpActive = "follow") : "";
                                        }}
                                        on:mouseleave={() => {
                                            !navigating ? (helpActive = undefined) : "";
                                        }}
                                    >
                                        <FollowIcon />
                                    </div>
                                    {#if helpActive === "follow" || !emoteMenuSubStore}
                                        <HelpTooltip
                                            title={$LL.actionbar.help.follow.title()}
                                            desc={$LL.actionbar.help.follow.desc()}
                                        />
                                    {/if}
                                </div>
                                <div
                                    class="group/btn-lock relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 rounded-none sm:first:rounded-l-lg sm:last:rounded-r-lg aspect-square"
                                    class:disabled={$currentPlayerGroupLockStateStore}
                                    on:click={() => analyticsClient.lockDiscussion()}
                                    on:click={lockClick}
                                    on:mouseenter={() => {
                                        !navigating ? (helpActive = "lock") : "";
                                    }}
                                    on:mouseleave={() => {
                                        !navigating ? (helpActive = undefined) : "";
                                    }}
                                >
                                    <div
                                        class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 rounded group-[.disabled]/btn-lock:bg-secondary hover:bg-white/10 flex items-center justify-center transition-all"
                                    >
                                        {#if $currentPlayerGroupLockStateStore}
                                            <LockIcon />
                                        {:else}
                                            <LockOpenIcon />
                                        {/if}
                                    </div>
                                    {#if helpActive === "lock" || !emoteMenuSubStore}
                                        <HelpTooltip
                                            title={$LL.actionbar.help.lock.title()}
                                            desc={$LL.actionbar.help.lock.desc()}
                                        />
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    </div>
                {/if}
                <div in:fly={{ delay: 1000, y: -200, duration: 750 }}>
                    <!-- ACTION WRAPPER : CAM & MIC -->
                    <div class="group/hardware flex items-center relative">
                        {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore}
                            <!-- NAV : MICROPHONE START -->
                            {#if $myMicrophoneStore}
                                <!-- svelte-ignore a11y-click-events-have-key-events -->
                                <div
                                    class="group/btn-mic peer/mic relative bg-contrast/80 backdrop-blur p-2 sm:pr-0 sm:last:pr-2 aspect-square {$bottomActionBarVisibilityStore
                                        ? 'rounded-none sm:rounded-l-lg'
                                        : 'rounded-l-lg'}"
                                    class:disabled={!$requestedMicrophoneState || $silentStore}
                                >
                                    <div
                                        class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 rounded group-[.disabled]/btn-mic:bg-danger hover:bg-white/10 flex items-center justify-center transition-all"
                                        on:click={() => analyticsClient.microphone()}
                                        on:click={microphoneClick}
                                        on:mouseenter={() => {
                                            !navigating ? (helpActive = "mic") : "";
                                        }}
                                        on:mouseleave={() => {
                                            !navigating ? (helpActive = undefined) : "";
                                        }}
                                    >
                                        {#if $requestedMicrophoneState && !$silentStore}
                                            <MicOnIcon />
                                        {:else}
                                            <MicOffIcon />
                                        {/if}
                                    </div>
                                    {#if helpActive === "mic" || !emoteMenuSubStore}
                                        <HelpTooltip
                                            title={$LL.actionbar.help.mic.title()}
                                            desc={$LL.actionbar.help.mic.desc()}
                                        />
                                    {/if}
                                </div>
                            {/if}
                        {/if}
                        <!-- NAV : MICROPHONE END -->
                        <!--{#if $microphoneListStore.length > 1 || $cameraListStore.length > 1 || $speakerListStore.length > 0}
                        {/if}-->
                        <div
                            class="absolute h-3 w-7 rounded-b bg-contrast/80 backdrop-blur left-0 right-0 m-auto p-1 z-10 opacity-0 transition-all -bottom-3 hidden sm:block {cameraActive
                                ? 'opacity-100'
                                : 'group-hover/hardware:opacity-100'}"
                        >
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
                        {#if cameraActive}
                            <div
                                class="absolute top-20 left-1/2 transform -translate-x-1/2 text-white rounded-lg w-64 overflow-hidden before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:left-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:-left-0 transition-all"
                                in:fly={{ y: 40, duration: 150 }}
                            >
                                {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
                                    <div class="my-2">
                                        <div class="flex text-xxs uppercase text-white/50 px-3 py-2 relative">
                                            {$LL.actionbar.subtitle.camera()}
                                        </div>
                                        {#each $cameraListStore as camera, index (index)}
                                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                                            <div
                                                class="group flex items-center relative z-10 py-1 px-4 overflow-hidden {$usedCameraDeviceIdStore ===
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
                                    <div class="my-2">
                                        <div class="flex text-xxs uppercase text-white/50 px-3 py-2 relative">
                                            {$LL.actionbar.subtitle.camera()}
                                        </div>
                                        <div class="group flex items-center relative z-10 px-4 font-sm justify-center">
                                            <div class="text-sm italic">
                                                {$LL.actionbar.camera.disabled()}
                                            </div>
                                        </div>
                                        <div class="group flex items-center relative z-10 py-1 px-4 overflow-hidden">
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
                                {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 1 && microphoneActive}
                                    <div class="my-2">
                                        <div class="flex text-xxs uppercase text-white/50 px-3 py-2 relative">
                                            {$LL.actionbar.subtitle.microphone()}
                                        </div>
                                        {#each $microphoneListStore as microphone, index (index)}
                                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                                            <div
                                                class="group flex items-center relative z-10 py-1 px-4 overflow-hidden {$usedMicrophoneDeviceIdStore ===
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
                                    <div class="my-2">
                                        <div class="flex text-xxs uppercase text-white/50 px-3 py-2 relative">
                                            {$LL.actionbar.subtitle.microphone()}
                                        </div>
                                        <div
                                            class="group flex items-center relative z-10 py-1 px-4 font-sm justify-center"
                                        >
                                            <div class="text-sm italic">
                                                {$LL.actionbar.microphone.disabled()}
                                            </div>
                                        </div>
                                        <div class="group flex items-center relative z-10 px-4 overflow-hidden">
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
                                    <div class="my-2">
                                        <div class="flex text-xxs uppercase text-white/50 px-3 py-1 relative">
                                            {$LL.actionbar.subtitle.speaker()}
                                        </div>
                                        {#each $speakerListStore as speaker, index (index)}
                                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                                            <div
                                                class="group flex items-center relative z-10 py-1 px-4 overflow-hidden {$speakerSelectedStore ===
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
                                <div class="relative z-10 flex px-4 py-3 bg-contrast">
                                    <button
                                        href="#"
                                        class="btn btn-xs btn-ghost btn-light justify-center w-full mr-3"
                                        on:click={openEnableCameraScene}>{$LL.actionbar.test()}</button
                                    >
                                    <button
                                        class="btn btn-xs btn-border btn-light justify-center w-full cursor-pointer"
                                        on:click|stopPropagation|preventDefault={() => (cameraActive = !cameraActive)}
                                        >{$LL.actionbar.close()}</button
                                    >
                                </div>
                            </div>
                        {/if}
                        <!-- NAV : CAMERA START -->
                        {#if $myCameraStore && !$silentStore}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                class="group/btn-cam relative bg-contrast/80 backdrop-blur p-2 sm:pr-0 sm:last:pr-2 rounded-r-lg sm:rounded-none sm:first:rounded-l-lg sm:last:rounded-r-lg aspect-square"
                                class:disabled={!$requestedCameraState || $silentStore}
                            >
                                <div
                                    class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 rounded group-[.disabled]/btn-cam:bg-danger hover:bg-white/10 flex items-center justify-center transition-all"
                                    on:click={() => analyticsClient.camera()}
                                    on:click={cameraClick}
                                    on:mouseenter={() => {
                                        !navigating ? (helpActive = "cam") : "";
                                    }}
                                    on:mouseleave={() => {
                                        !navigating ? (helpActive = undefined) : "";
                                    }}
                                >
                                    {#if $requestedCameraState && !$silentStore}
                                        <CamOnIcon />
                                    {:else}
                                        <CamOffIcon />
                                    {/if}
                                </div>
                                {#if helpActive === "cam" || !emoteMenuSubStore}
                                    <HelpTooltip
                                        title={$LL.actionbar.help.cam.title()}
                                        desc={$LL.actionbar.help.cam.desc()}
                                    />
                                {/if}
                            </div>
                        {/if}
                        <!-- NAV : CAMERA END -->

                        <!-- NAV : SCREENSHARING START -->
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        {#if $bottomActionBarVisibilityStore}
                            <div
                                class="group/btn-screen-share relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg aspect-square hidden sm:block"
                                on:click={() => analyticsClient.screenSharing()}
                                on:click={screenSharingClick}
                                on:mouseenter={() => {
                                    !navigating ? (helpActive = "share") : "";
                                }}
                                on:mouseleave={() => {
                                    !navigating ? (helpActive = undefined) : "";
                                }}
                            >
                                <div
                                    class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 rounded group-[.disabled]/btn-screen-share:bg-secondary hover:bg-white/10 flex items-center justify-center transition-all {$requestedScreenSharingState &&
                                    !$silentStore
                                        ? 'bg-secondary hover:bg-danger'
                                        : ''}"
                                >
                                    {#if $requestedScreenSharingState && !$silentStore}
                                        <ScreenShareOffIcon />
                                    {:else}
                                        <ScreenShareIcon />
                                    {/if}
                                </div>
                                {#if helpActive === "share" || !emoteMenuSubStore}
                                    <HelpTooltip
                                        title={$LL.actionbar.help.share.title()}
                                        desc={$LL.actionbar.help.share.desc()}
                                    />
                                {/if}
                            </div>
                            <div
                                class="group/btn-menu-cam relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg aspect-square hidden sm:block"
                                on:click={() => (camMenuIsDropped = !camMenuIsDropped)}
                            >
                                <div
                                    class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 rounded group-[.disabled]/btn-screen-share:bg-secondary hover:bg-white/10 flex items-center justify-center transition-all {$requestedScreenSharingState &&
                                    !$silentStore
                                        ? 'bg-secondary hover:bg-danger'
                                        : ''}"
                                >
                                    {#if $requestedScreenSharingState && !$silentStore}
                                        <ScreenShareOffIcon />
                                    {:else}
                                        <ScreenShareIcon />
                                    {/if}
                                </div>
                                {#if helpActive === "share" || !emoteMenuSubStore}
                                    <HelpTooltip
                                        title={$LL.actionbar.help.share.title()}
                                        desc={$LL.actionbar.help.share.desc()}
                                    />
                                {/if}
                            </div>

                            {#if camMenuIsDropped}
                                <div
                                    class="absolute mt-2 top-14 @xl/actions:top-16 bg-contrast/80 backdrop-blur rounded-lg py-2 w-56 left-24 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all hidden @md/actions:block max-h-[calc(100vh-96px)] overflow-y-auto"
                                    transition:fly={{ y: 40, duration: 150 }}
                                >
                                    <div class="p-0 m-0 list-none">
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={lightModeOn}
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                            >
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.lightMode()}</div>
                                        </button>
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={focusModeOn}
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                            >
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.focusMode()}</div>
                                        </button>
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={rightModeOn}
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                            >
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.rightMode()}</div>
                                        </button>
                                        <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                            on:click={hideModeOn}
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                            >
                                                <ProfilIcon />
                                            </div>
                                            <div>{$LL.actionbar.hideMode()}</div>
                                        </button>

                                        <!-- <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full pointer-events-auto"
                                            on:click={() => openEditCompanionScene()}
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                            >
                                                <Companion
                                                    userId={-1}
                                                    placeholderSrc="./static/images/default-companion.png"
                                                    width="26px"
                                                    height="26px"
                                                />
                                            </div>
                                            <div>{$LL.actionbar.companion()}</div>
                                        </button> -->
                                        <!-- <button
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full pointer-events-auto"
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                            >
                                                <AchievementIcon />
                                            </div>
                                            <div>{$LL.actionbar.quest()}</div>
                                        </button> -->
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
                                    on:mouseenter={() => {
                                        !navigating ? (helpActive = button.id) : "";
                                    }}
                                    on:mouseleave={() => {
                                        !navigating ? (helpActive = undefined) : "";
                                    }}
                                    class="h-12 min-w-12 @sm/actions:min-w-10 @sm/actions:h-10 @xl/actions:h-12 @xl/actions:min-w-12 p-1 m-0 rounded hover:bg-white/10 flex items-center justify-center transition-all"
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
                                        in:fly={{}}
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
                                        in:fly={{}}
                                        on:dragstart|preventDefault={noDrag}
                                        on:click={() => analyticsClient.openInvite()}
                                        on:click={() => showMenuItem(SubMenusInterface.invite)}
                                        class="btn h-12 @sm/actions:h-10 @xl/actions:h-12 text-base @sm/actions:text-sm @xl/actions:text-base rounded select-none !px-4 transition-all {!$userIsConnected &&
                                        ENABLE_OPENID
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
                                        class="btn btn-secondary h-12 @sm/actions:h-10 @xl/actions:h-12 text-base @sm/actions:text-sm @xl/actions:text-base rounded select-none ml-2 !px-4 transition-all"
                                    >
                                        {$LL.actionbar.login()}
                                    </a>
                                {/if}
                            </div>
                        </div>
                    </div>
                {/if}
                {#if $mapEditorActivated || $userHasAccessToBackOfficeStore}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        id="action-admin"
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
                                class="absolute mt-2 top-14 @xl/actions:top-16 right-0 bg-contrast/80 backdrop-blur rounded-lg py-2 w-56 right-0 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all"
                                transition:fly={{ y: 40, duration: 150 }}
                            >
                                <ul class="p-0 m-0">
                                    {#if $mapEditorActivated}
                                        <li
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold"
                                            on:click={() => toggleMapEditorMode()}
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                            >
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
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold"
                                            on:click={() => openBo()}
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                            >
                                                <AdjustmentsIcon />
                                            </div>
                                            <div>{$LL.actionbar.bo()}</div>
                                        </li>
                                    {/if}
                                    <li
                                        class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold"
                                    >
                                        <div
                                            class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
                                        >
                                            <MessageGlobalIcon />
                                        </div>
                                        <div>{$LL.actionbar.globalMessage()}</div>
                                    </li>
                                    {#if $megaphoneCanBeUsedStore && !$silentStore && ($myMicrophoneStore || $myCameraStore)}
                                        <li
                                            class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold"
                                        >
                                            <div
                                                class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center"
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
                    id="action-user"
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
                            <div
                                class="grow flex items-center flex-row @xl/actions:flex-col justify-start text-left pr-2"
                            >
                                <div
                                    class="font-bold text-white leading-5 whitespace-nowrap select-none text-base @sm/actions:text-sm @xl/actions:text-base order-last @xl/actions:order-first flex items-center"
                                >
                                    {userName}
                                </div>
                                <div class="text-xxs bold whitespace-nowrap select-none flex items-center">
                                    {#if $availabilityStatusStore === 1}
                                        <div class="aspect-square h-2 w-2 bg-success rounded-full mr-2" />
                                        <div class="text-success hidden @xl/actions:block">
                                            {$LL.actionbar.status.online()}
                                        </div>
                                    {/if}
                                    {#if $availabilityStatusStore === 2}
                                        <div class="aspect-square h-2 w-2 bg-warning rounded-full mr-2" />
                                        <div class="text-warning hidden @xl/actions:block">
                                            {$LL.actionbar.status.away()}
                                        </div>
                                    {/if}
                                    {#if $availabilityStatusStore === 3}
                                        <div class="aspect-square h-2 w-2 bg-danger rounded-full mr-2" />
                                        <div class="text-danger hidden @xl/actions:block">
                                            {$LL.actionbar.status.disturb()}
                                        </div>
                                    {/if}
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
                            class="absolute mt-2 top-14 @xl/actions:top-16 bg-contrast/80 backdrop-blur rounded-lg py-2 w-56 right-0 text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-[14px] before:right-6 before:border-solid before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all hidden @md/actions:block max-h-[calc(100vh-96px)] overflow-y-auto"
                            transition:fly={{ y: 40, duration: 150 }}
                        >
                            <div class="p-0 m-0 list-none">
                                <a
                                    href="https://workadventu.re/pricing/"
                                    target="_blank"
                                    class="group flex px-2 transition-all cursor-pointer text-sm font-bold w-full text-white no-underline"
                                >
                                    <div class="flex items-center px-3 py-3 w-full bg-white/10 rounded">
                                        <div class="w-full text-left">{$LL.actionbar.accountType()}</div>
                                        <div class="">
                                            <div class="btn btn-light btn-sm">
                                                {$LL.actionbar.upgrade()}
                                            </div>
                                        </div>
                                    </div>
                                </a>
                                <div class="h-[1px] w-full bg-white/20 my-2" />
                                <button
                                    class="group flex px-4 py-1 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                    on:click={() => openEditNameScene()}
                                >
                                    <div class="aspect-square h-2 w-2 bg-success rounded-full ml-2 mr-3" />
                                    <div
                                        class="mr-3 grow text-left {$availabilityStatusStore === 1 ? '' : 'opacity-50'}"
                                    >
                                        {$LL.actionbar.status.online()}
                                    </div>
                                    {#if $availabilityStatusStore === 1}
                                        <div class="">
                                            <CheckIcon height="h-4" width="h-4" />
                                        </div>
                                    {/if}
                                </button>
                                <button
                                    class="group flex px-4 py-1 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                    on:click={() => openEditNameScene()}
                                >
                                    <div class="aspect-square h-2 w-2 bg-warning rounded-full ml-2 mr-3" />
                                    <div
                                        class="mr-3 grow text-left {$availabilityStatusStore === 2 ? '' : 'opacity-50'}"
                                    >
                                        {$LL.actionbar.status.away()}
                                    </div>
                                    {#if $availabilityStatusStore === 2}
                                        <div class="">
                                            <CheckIcon height="h-4" width="h-4" />
                                        </div>
                                    {/if}
                                </button>
                                <button
                                    class="group flex px-4 py-1 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                    on:click={() => openEditNameScene()}
                                >
                                    <div class="aspect-square h-2 w-2 bg-danger rounded-full ml-2 mr-3" />
                                    <div
                                        class="mr-3 grow text-left {$availabilityStatusStore === 3 ? '' : 'opacity-50'}"
                                    >
                                        {$LL.actionbar.status.disturb()}
                                    </div>
                                    {#if $availabilityStatusStore === 3}
                                        <div class="">
                                            <CheckIcon height="h-4" width="h-4" />
                                        </div>
                                    {/if}
                                </button>
                                <button
                                    class="group flex px-4 py-1 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                    on:click={() => openEditNameScene()}
                                >
                                    <div class="aspect-square h-2 w-2 bg-neutral rounded-full ml-2 mr-3" />
                                    <div
                                        class="mr-3 grow text-left {$availabilityStatusStore === 4 ? '' : 'opacity-50'}"
                                    >
                                        {$LL.actionbar.status.offline()}
                                    </div>
                                    {#if $availabilityStatusStore === 4}
                                        <div class="">
                                            <CheckIcon height="h-4" width="h-4" />
                                        </div>
                                    {/if}
                                </button>
                                <div class="h-[1px] w-full bg-white/20 my-2" />
                                <button
                                    class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                    on:click={() => openEditNameScene()}
                                >
                                    <div class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center">
                                        <ProfilIcon />
                                    </div>
                                    <div>{$LL.actionbar.profil()}</div>
                                </button>
                                <button
                                    class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                    on:click={() => openEditSkinScene()}
                                >
                                    <div class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center">
                                        <Woka userId={-1} placeholderSrc="" customWidth="26px" customHeight="26px" />
                                    </div>
                                    <div>{$LL.actionbar.woka()}</div>
                                </button>
                                <button
                                    class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full pointer-events-auto"
                                    on:click={() => openEditCompanionScene()}
                                >
                                    <div class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center">
                                        <Companion
                                            userId={-1}
                                            placeholderSrc="./static/images/default-companion.png"
                                            width="26px"
                                            height="26px"
                                        />
                                    </div>
                                    <div>{$LL.actionbar.companion()}</div>
                                </button>
                                <button
                                    class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full pointer-events-auto"
                                >
                                    <div class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center">
                                        <AchievementIcon />
                                    </div>
                                    <div>{$LL.actionbar.quest()}</div>
                                </button>
                                <div class="h-[1px] w-full bg-white/20 my-2" />
                                <button
                                    class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                    on:click={openEnableCameraScene}
                                >
                                    <div class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center">
                                        <CamSettingsIcon />
                                    </div>
                                    <div>{$LL.actionbar.editCamMic()}</div>
                                </button>
                                <button
                                    class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold w-full"
                                    on:click={() => showMenuItem(SubMenusInterface.settings)}
                                >
                                    <div class="group-hover:mr-2 transition-all w-6 h-6 aspect-square mr-3 text-center">
                                        <SettingsIcon />
                                    </div>
                                    <div>{$LL.actionbar.otherSettings()}</div>
                                </button>
                            </div>
                        </div>
                    {/if}
                </div>
                <div
                    class="group/btn-burger relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 rounded-l-lg rounded-r-lg aspect-square block @lg:hidden"
                >
                    <div
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
                    </div>
                </div>
            </div>
        </div>
    </div>
    {#if burgerOpen}
        <div
            class="w-48 bg-contrast/80 absolute right-2 top-auto bottom-20 sm:bottom-auto sm:top-18 z-[1000] py-4 rounded-lg text-right text-white no-underline pointer-events-auto block @lg:hidden before:content-[''] before:absolute before:w-0 before:h-0 sm:before:-top-[14px] sm:before:bottom-auto before:-bottom-4 before:top-auto before:rotate-180 sm:before:rotate-0 before:right-5 before:border-solid before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all"
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
                            class="flex items-center justify-center btn btn-ghost btn-sm btn-light rounded select-none"
                        >
                            <img draggable="false" src={button.imageSrc} alt={button.toolTip} class="h-6 mr-2" />
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
    * {
        font-family: "Roboto Condensed";
    }
    .translate-right {
        transform: translateX(2rem);
    }
    @include media-breakpoint-down(sm) {
        //is equal to tailwind's sm breakpoint
        .translate-right {
            transform: translateX(0);
        }
        .move-menu {
            transform: translateX(-3rem);
        }
    }
</style>
