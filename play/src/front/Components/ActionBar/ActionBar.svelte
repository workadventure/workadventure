<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    //import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from "svelte-feather-icons";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { writable } from "svelte/store";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import { myJitsiCameraStore, streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    //import { jitsiLoadingStore } from "../../Streaming/BroadcastService";
    //import Loading from "../Video/Loading.svelte";
    //import { highlightedEmbedScreen } from "../../Stores/HighlightedEmbedScreenStore";
    //import CamerasContainer from "../EmbedScreens/CamerasContainer.svelte";
    //import MediaBox from "../Video/MediaBox.svelte";
    import MyCamera from "../MyCamera.svelte";
    import {
        cameraListStore,
        localStreamStore,
        localVolumeStore,
        speakerListStore,
        requestedCameraState,
        requestedMicrophoneState,
        silentStore,
        speakerSelectedStore,
        streamingMegaphoneStore, enableCameraSceneVisibilityStore,
    } from "../../Stores/MediaStore";
    import WorkAdventureImg from "../images/icon-workadventure-white.png";
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
        mapEditorActivated, menuIconVisiblilityStore,
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
    //import { StringUtils } from "../../Utils/StringUtils";
    import Tooltip from "../Util/Tooltip.svelte";
    import { modalIframeStore, modalVisibilityStore } from "../../Stores/ModalStore";
    import { userHasAccessToBackOfficeStore } from "../../Stores/GameStore";
    import { AddButtonActionBarEvent } from "../../Api/Events/Ui/ButtonActionBarEvent";
    import { Emoji } from "../../Stores/Utils/emojiSchema";
    import {
        megaphoneCanBeUsedStore,
        megaphoneEnabledStore,
        requestedMegaphoneStore,
    } from "../../Stores/MegaphoneStore";
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
    import MegaphoneConfirm from "./MegaphoneConfirm.svelte";
    import Woka from "../Woka/WokaFromUserId.svelte";
    import Companion from "../Companion/Companion.svelte";
    import {loginSceneVisibleStore} from "../../Stores/LoginSceneStore";
    import {LoginScene, LoginSceneName} from "../../Phaser/Login/LoginScene";
    import {selectCharacterSceneVisibleStore} from "../../Stores/SelectCharacterStore";
    import {SelectCharacterScene, SelectCharacterSceneName} from "../../Phaser/Login/SelectCharacterScene";
    import {selectCompanionSceneVisibleStore} from "../../Stores/SelectCompanionStore";
    import {SelectCompanionScene, SelectCompanionSceneName} from "../../Phaser/Login/SelectCompanionScene";
    import {EnableCameraScene, EnableCameraSceneName} from "../../Phaser/Login/EnableCameraScene";
    import HorizontalSoundMeterWidget from "../EnableCamera/HorizontalSoundMeterWidget.svelte";

    const menuImg = gameManager.currentStartedRoom?.miniLogo ?? WorkAdventureImg;

    let selectedMicrophone: string | undefined = undefined;
    let cameraActive = false;
    let microphoneActive = false;
    let profileMenuIsDropped = false;
    let adminMenuIsDropped = false;
    let menuExpand = false;

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
            layoutManagerActionStore.removeAction("megaphoneNeedCameraOrMicrophone");
        }
    }

    function microphoneClick(): void {
        if ($silentStore) return;
        if ($requestedMicrophoneState === true) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
            layoutManagerActionStore.removeAction("megaphoneNeedCameraOrMicrophone");
        }
    }

    function switchLayoutMode() {
        if ($embedScreenLayoutStore === LayoutMode.Presentation) {
            $embedScreenLayoutStore = LayoutMode.VideoChat;
        } else {
            $embedScreenLayoutStore = LayoutMode.Presentation;
        }
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
        }
    }

    function toggleMegaphone() {
        if ($streamingMegaphoneStore) {
            streamingMegaphoneStore.set(false);
            return;
        }
        if ($requestedMegaphoneStore || $megaphoneEnabledStore) {
            analyticsClient.stopMegaphone();
            requestedMegaphoneStore.set(false);
            return;
        }

        streamingMegaphoneStore.set(true);
    }

    function toggleMapEditorMode() {
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
    function disableMenuStores() {
        menuVisiblilityStore.set(false);
        menuIconVisiblilityStore.set(false);
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
        disableMenuStores();
        loginSceneVisibleStore.set(true);
        gameManager.leaveGame(LoginSceneName, new LoginScene());
    }

    function openEditSkinScene() {
        disableMenuStores();
        selectCharacterSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCharacterSceneName, new SelectCharacterScene());
    }

    function openEditCompanionScene() {
        disableMenuStores();
        selectCompanionSceneVisibleStore.set(true);
        gameManager.leaveGame(SelectCompanionSceneName, new SelectCompanionScene());
    }

    function openEnableCameraScene() {
        disableMenuStores();
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
    /*
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
    */
    let subscribers = new Array<Unsubscriber>();
    let totalMessagesToSee = writable<number>(0);
    onMount(() => {
        iframeListener.chatTotalMessagesToSeeStream.subscribe((total) => totalMessagesToSee.set(total));
    });

    onDestroy(() => {
        subscribers.map((subscriber) => subscriber());
        unsubscribeLocalStreamStore();
    });

    let stream: MediaStream | null;
    const unsubscribeLocalStreamStore = localStreamStore.subscribe((value) => {
        if (value.type === "success") {
            stream = value.stream;

            if (stream !== null) {
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                    // set default speaker selected
                    if ($speakerListStore && $speakerListStore.length > 0) {
                        speakerSelectedStore.set($speakerListStore[0].deviceId);
                    }
                }
            }
        } else {
            stream = null;
        }
    });

    const isMobile = isMediaBreakpointUp("md");

    function buttonActionBarTrigger(id: string) {
        const button = $additionnalButtonsMenu.get(id) as AddButtonActionBarEvent;
        return iframeListener.sendButtonActionBarTriggered(button);
    }
</script>
<svelte:window on:keydown={onKeyDown} />
<div class="grid grid-cols-3 justify-items-stretch absolute top-0 w-full p-4 pointer-events-auto">
    <div class="justify-self-start" transition:fly={{delay: 500, y: -200, duration: 1500 }}>
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
                on:click={() =>
			analyticsClient.openedChat()}
                on:click={toggleChat}
                class="flex relative transition-all duration-150 {chatVisibilityStore ? 'translate-x-0 opacity-100 visible' : 'translate-x-64 opacity-0 invisible'}"
        >

            <div class="group/btn-chat relative bg-contrast/80 transition-all backdrop-blur first:rounded-l-lg last:rounded-r-lg p-2 aspect-square">
                <div class="h-12 w-12 rounded group-hover/btn-chat:bg-white/10 aspect-square flex items-center justify-center transition-all">
                    <svg class="m-auto" width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 17L2.3 13.1C1.17644 11.4383 0.769993 9.47043 1.15622 7.56232C1.54244 5.65421 2.69506 3.93569 4.39977 2.72629C6.10447 1.51689 8.24526 0.898916 10.4241 0.987258C12.6029 1.0756 14.6715 1.86425 16.2453 3.20658C17.819 4.5489 18.7909 6.35356 18.9801 8.285C19.1693 10.2164 18.563 12.1432 17.2739 13.7071C15.9848 15.271 14.1007 16.3656 11.9718 16.7874C9.84293 17.2091 7.6142 16.9293 5.7 16L1 17Z" stroke="white" stroke-width="1.83333" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                {#if $chatZoneLiveStore || $peerStore.size > 0}
                    <div>
                        <span class="w-4 h-4 block rounded-full absolute -top-1 -left-1 animate-ping {$peerStore.size > 0 ? 'bg-success' : 'bg-danger'}"></span>
                        <span class="w-3 h-3 block rounded-full absolute -top-0.5 -left-0.5 {$peerStore.size > 0 ? 'bg-success' : 'bg-danger'}" ></span>
                    </div>
                {:else if $totalMessagesToSee > 0}
                    <div class="absolute -top-2 -right-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full ">
                        {$totalMessagesToSee}
                    </div>
                {/if}
            </div>

            <div class="group/btn-chat relative bg-contrast/80 transition-all backdrop-blur first:rounded-l-lg last:rounded-r-lg p-2 aspect-square">
                <div class="h-12 w-12 rounded group-hover/btn-chat:bg-white/10 aspect-square flex items-center justify-center  transition-all">
                    <svg xmlns="http://www.w3.org/2000/svg" class="" width="24" height="24" viewBox="0 0 24 24" stroke-width="1.5" stroke="#ffffff" fill="none" stroke-linecap="round" stroke-linejoin="round">
                        <path stroke="none" d="M0 0h24v24H0z" fill="none"/>
                        <path d="M9 7m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0" />
                        <path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                        <path d="M21 21v-2a4 4 0 0 0 -3 -3.85" />
                    </svg>
                </div>
            </div>
        </div>
    </div>
    <div class="justify-self-center" transition:fly={{delay: 1000, y: -200, duration: 1500 }}>
        <div class="flex relative">
            <div class={menuExpand ? "group menuExpand" : ""}>
                <div class="flex items-center mr-4 absolute right-28">
                    {#if menuExpand}
                        <div class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg  aspect-square">
                            <div class="h-12 w-12 rounded group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all">
                                <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1.5 3.75C1.5 3.15326 1.73705 2.58097 2.15901 2.15901C2.58097 1.73705 3.15326 1.5 3.75 1.5H6C6.59674 1.5 7.16903 1.73705 7.59099 2.15901C8.01295 2.58097 8.25 3.15326 8.25 3.75V4.875C8.25 5.47174 8.01295 6.04403 7.59099 6.46599C7.16903 6.88795 6.59674 7.125 6 7.125H3.75C3.15326 7.125 2.58097 6.88795 2.15901 6.46599C1.73705 6.04403 1.5 5.47174 1.5 4.875V3.75Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M1.5 13.875C1.5 13.2783 1.73705 12.706 2.15901 12.284C2.58097 11.8621 3.15326 11.625 3.75 11.625H6C6.59674 11.625 7.16903 11.8621 7.59099 12.284C8.01295 12.706 8.25 13.2783 8.25 13.875V17.25C8.25 17.8467 8.01295 18.419 7.59099 18.841C7.16903 19.2629 6.59674 19.5 6 19.5H3.75C3.15326 19.5 2.58097 19.2629 2.15901 18.841C1.73705 18.419 1.5 17.8467 1.5 17.25V13.875Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12.75 3.75C12.75 3.15326 12.9871 2.58097 13.409 2.15901C13.831 1.73705 14.4033 1.5 15 1.5H17.25C17.8467 1.5 18.419 1.73705 18.841 2.15901C19.2629 2.58097 19.5 3.15326 19.5 3.75V7.125C19.5 7.72174 19.2629 8.29403 18.841 8.71599C18.419 9.13795 17.8467 9.375 17.25 9.375H15C14.4033 9.375 13.831 9.13795 13.409 8.71599C12.9871 8.29403 12.75 7.72174 12.75 7.125V3.75Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12.75 16.125C12.75 15.5283 12.9871 14.956 13.409 14.534C13.831 14.1121 14.4033 13.875 15 13.875H17.25C17.8467 13.875 18.419 14.1121 18.841 14.534C19.2629 14.956 19.5 15.5283 19.5 16.125V17.25C19.5 17.8467 19.2629 18.419 18.841 18.841C18.419 19.2629 17.8467 19.5 17.25 19.5H15C14.4033 19.5 13.831 19.2629 13.409 18.841C12.9871 18.419 12.75 17.8467 12.75 17.25V16.125Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </div>
                        <dƒiv class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg  aspect-square">
                            <div class="h-12 w-12 rounded group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all">
                                <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.875 3.625C5.875 4.22174 5.63795 4.79403 5.21599 5.21599C4.79403 5.63795 4.22174 5.875 3.625 5.875C3.02826 5.875 2.45597 5.63795 2.03401 5.21599C1.61205 4.79403 1.375 4.22174 1.375 3.625C1.375 3.02826 1.61205 2.45597 2.03401 2.03401C2.45597 1.61205 3.02826 1.375 3.625 1.375C4.22174 1.375 4.79403 1.61205 5.21599 2.03401C5.63795 2.45597 5.875 3.02826 5.875 3.625ZM5.875 3.625L16.5625 3.625C17.6068 3.625 18.6083 4.03984 19.3467 4.77827C20.0852 5.51669 20.5 6.51821 20.5 7.5625C20.5 8.60679 20.0852 9.60831 19.3467 10.3467C18.6083 11.0852 17.6068 11.5 16.5625 11.5H6.4375C5.39321 11.5 4.39169 11.9148 3.65327 12.6533C2.91484 13.3917 2.5 14.3932 2.5 15.4375C2.5 16.4818 2.91484 17.4833 3.65327 18.2217C4.39169 18.9602 5.39321 19.375 6.4375 19.375H21.625M21.625 19.375L18.25 16M21.625 19.375L18.25 22.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </dƒiv>
                        <div on:click={toggleEmojiPicker} class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg  aspect-square" >
                            <div class="h-12 w-12 rounded group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <g>
                                        <path d="M9 10H9.01M15 10H15.01M9.5 15C9.82588 15.3326 10.2148 15.5968 10.6441 15.7772C11.0734 15.9576 11.5344 16.0505 12 16.0505C12.4656 16.0505 12.9266 15.9576 13.3559 15.7772C13.7852 15.5968 14.1741 15.3326 14.5 15M3 12C3 13.1819 3.23279 14.3522 3.68508 15.4442C4.13738 16.5361 4.80031 17.5282 5.63604 18.364C6.47177 19.1997 7.46392 19.8626 8.55585 20.3149C9.64778 20.7672 10.8181 21 12 21C13.1819 21 14.3522 20.7672 15.4442 20.3149C16.5361 19.8626 17.5282 19.1997 18.364 18.364C19.1997 17.5282 19.8626 16.5361 20.3149 15.4442C20.7672 14.3522 21 13.1819 21 12C21 10.8181 20.7672 9.64778 20.3149 8.55585C19.8626 7.46392 19.1997 6.47177 18.364 5.63604C17.5282 4.80031 16.5361 4.13738 15.4442 3.68508C14.3522 3.23279 13.1819 3 12 3C10.8181 3 9.64778 3.23279 8.55585 3.68508C7.46392 4.13738 6.47177 4.80031 5.63604 5.63604C4.80031 6.47177 4.13738 7.46392 3.68508 8.55585C3.23279 9.64778 3 10.8181 3 12Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </g>
                                </svg>
                            </div>
                        </div>
                    {/if}
                    <div class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg  aspect-square">
                        <div class="h-12 w-12 rounded group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all" on:click={() =>menuExpand = !menuExpand}>
                            <svg class:rotate-180={menuExpand} class="block" width="9" height="17" viewBox="0 0 9 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.875 15.25L1.125 8.5L7.875 1.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                    {#if $bottomActionBarVisibilityStore}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div class="group/btn-lock relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg aspect-square"
                             class:disabled={$currentPlayerGroupLockStateStore}
                             on:click={() =>analyticsClient.lockDiscussion()}
                             on:click={lockClick}
                        >
                            <Tooltip text={$LL.actionbar.lock()} />
                            <div class="h-12 w-12 p-1 m-0 rounded group-[.disabled]/btn-lock:bg-secondary hover:bg-white/10 flex items-center justify-center transition-all">
                                {#if $currentPlayerGroupLockStateStore}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g>
                                            <path d="M8 11V6C8 4.93913 8.42143 3.92172 9.17157 3.17157C9.92172 2.42143 10.9391 2 12 2C13.0609 2 14.0783 2.42143 14.8284 3.17157C15.5786 3.92172 16 4.93913 16 6M5 13C5 12.4696 5.21071 11.9609 5.58579 11.5858C5.96086 11.2107 6.46957 11 7 11H17C17.5304 11 18.0391 11.2107 18.4142 11.5858C18.7893 11.9609 19 12.4696 19 13V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V13ZM11 16C11 16.2652 11.1054 16.5196 11.2929 16.7071C11.4804 16.8946 11.7348 17 12 17C12.2652 17 12.5196 16.8946 12.7071 16.7071C12.8946 16.5196 13 16.2652 13 16C13 15.7348 12.8946 15.4804 12.7071 15.2929C12.5196 15.1054 12.2652 15 12 15C11.7348 15 11.4804 15.1054 11.2929 15.2929C11.1054 15.4804 11 15.7348 11 16Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </g>
                                    </svg>
                                {:else}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g>
                                            <path d="M8 11V7C8 5.93913 8.42143 4.92172 9.17157 4.17157C9.92172 3.42143 10.9391 3 12 3C13.0609 3 14.0783 3.42143 14.8284 4.17157C15.5786 4.92172 16 5.93913 16 7V11M5 13C5 12.4696 5.21071 11.9609 5.58579 11.5858C5.96086 11.2107 6.46957 11 7 11H17C17.5304 11 18.0391 11.2107 18.4142 11.5858C18.7893 11.9609 19 12.4696 19 13V19C19 19.5304 18.7893 20.0391 18.4142 20.4142C18.0391 20.7893 17.5304 21 17 21H7C6.46957 21 5.96086 20.7893 5.58579 20.4142C5.21071 20.0391 5 19.5304 5 19V13ZM11 16C11 16.2652 11.1054 16.5196 11.2929 16.7071C11.4804 16.8946 11.7348 17 12 17C12.2652 17 12.5196 16.8946 12.7071 16.7071C12.8946 16.5196 13 16.2652 13 16C13 15.7348 12.8946 15.4804 12.7071 15.2929C12.5196 15.1054 12.2652 15 12 15C11.7348 15 11.4804 15.1054 11.2929 15.2929C11.1054 15.4804 11 15.7348 11 16Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </g>
                                    </svg>
                                {/if}
                            </div>
                        </div>
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div class="group/btn-lock relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg aspect-square"
                             on:click={() =>analyticsClient.screenSharing()}
                             on:click={screenSharingClick}
                        >
                            <Tooltip text={$LL.actionbar.screensharing()} />
                            <div class="h-12 w-12 p-1 m-0 rounded group-[.disabled]/btn-lock:bg-secondary hover:bg-white/10 flex items-center justify-center transition-all">
                                {#if $requestedScreenSharingState && !$silentStore}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g>
                                            <path d="M21 12V15C21 15.2652 20.8946 15.5196 20.7071 15.7071C20.5196 15.8946 20.2652 16 20 16H4C3.73478 16 3.48043 15.8946 3.29289 15.7071C3.10536 15.5196 3 15.2652 3 15V5C3 4.73478 3.10536 4.48043 3.29289 4.29289C3.48043 4.10536 3.73478 4 4 4H13M7 20H17M9 16V20M15 16V20M17 8L21 4M17 4L21 8" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </g>
                                    </svg>
                                {:else}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <g>
                                            <path d="M21 12V15C21 15.2652 20.8946 15.5196 20.7071 15.7071C20.5196 15.8946 20.2652 16 20 16H4C3.73478 16 3.48043 15.8946 3.29289 15.7071C3.10536 15.5196 3 15.2652 3 15V5C3 4.73478 3.10536 4.48043 3.29289 4.29289C3.48043 4.10536 3.73478 4 4 4H13M7 20H17M9 16V20M15 16V20M17 4H21M21 4V8M21 4L16 9" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </g>
                                    </svg>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>
            <div>
                <!-- ACTION WRAPPER : CAM & MIC -->
                <div class="flex items-center">
                    {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore}
                        <!-- NAV : MICROPHONE START -->
                        {#if $myMicrophoneStore}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div
                                    class="group/btn-mic peer/mic relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg aspect-square"
                                    class:disabled={!$requestedMicrophoneState || $silentStore}
                            >
                                <div
                                        class="h-12 w-12 p-1 m-0 rounded group-[.disabled]/btn-mic:bg-danger hover:bg-white/10 flex items-center justify-center transition-all"
                                        on:click={() =>analyticsClient.microphone()}
                                        on:click={microphoneClick}
                                >
                                    {#if $requestedMicrophoneState && !$silentStore}
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 11.1451 14.5194 12.0036 13.8865 12.6365C13.2536 13.2694 12.3951 13.625 11.5 13.625C10.6049 13.625 9.74645 13.2694 9.11351 12.6365C8.48058 12.0036 8.125 11.1451 8.125 10.25V4.625Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M3.625 10.25C3.625 12.3386 4.45469 14.3416 5.93153 15.8185C7.40838 17.2953 9.41142 18.125 11.5 18.125C13.5886 18.125 15.5916 17.2953 17.0685 15.8185C18.5453 14.3416 19.375 12.3386 19.375 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                        </svg>
                                    {:else}
                                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 10.5832 14.8258 10.9145 14.7287 11.2332M12.4788 13.4832C11.9744 13.6361 11.4412 13.6687 10.922 13.5784C10.4028 13.4882 9.9119 13.2776 9.4887 12.9635C9.06549 12.6494 8.72171 12.2406 8.48491 11.7698C8.2481 11.299 8.12484 10.7793 8.125 10.2522V9.12725" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M3.625 10.25C3.62475 11.6713 4.00915 13.0661 4.73742 14.2866C5.46568 15.5071 6.51068 16.5077 7.76159 17.1824C9.01249 17.8571 10.4227 18.1807 11.8426 18.1189C13.2625 18.0571 14.6392 17.6121 15.8267 16.8313M18.0767 14.5813C18.9248 13.2961 19.3756 11.7897 19.3727 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    {/if}
                                </div>
                                <div class="group-hover/btn-mic:block hidden absolute p-4 w-60 text-white text-center rounded-lg top-20 left-1/2 transform -translate-x-1/2 before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:left-0 before:top-0 before:rounded before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:left-0">
                                    <div class="w-4 overflow-hidden inline-block absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <div class=" h-3 w-3 rotate-45 transform origin-bottom-left bg-contrast/80 backdrop-blur"></div>
                                    </div>
                                    <div class="relative z-10">
                                        <div class="italic mb-3 text-sm">Click on icon to turn {$requestedMicrophoneState && !$silentStore ? "OFF" : "ON"} microphone</div>
                                        {#if selectedMicrophone != undefined}
                                            <div class="w-full flex flex-col flex-wrap content-center mt-6">
                                                <HorizontalSoundMeterWidget spectrum={$localVolumeStore} />
                                            </div>
                                        {/if}
                                        <button  class="btn btn-sm btn-border btn-light text-center block">
                                            Edit mic/speaker settings
                                        </button>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/if}
                    <!-- NAV : MICROPHONE END -->
                    <!-- NAV : CAMERA START -->
                    {#if $myCameraStore}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div class="group/btn-cam relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg aspect-square"
                             class:disabled={!$requestedCameraState || $silentStore}
                        >
                            <div
                                    class="h-12 w-12 p-1 m-0 rounded group-[.disabled]/btn-cam:bg-danger hover:bg-white/10 flex items-center justify-center transition-all"
                                    on:click={() => analyticsClient.camera()}
                                    on:click={cameraClick}
                            >
                                {#if $requestedCameraState && !$silentStore}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M14.875 10.25L19.9971 7.68951C20.1686 7.60383 20.3591 7.56338 20.5506 7.572C20.7421 7.58063 20.9282 7.63804 21.0913 7.73879C21.2544 7.83955 21.389 7.9803 21.4824 8.14769C21.5758 8.31509 21.6249 8.50357 21.625 8.69526V16.3048C21.6249 16.4965 21.5758 16.6849 21.4824 16.8523C21.389 17.0197 21.2544 17.1605 21.0913 17.2612C20.9282 17.362 20.7421 17.4194 20.5506 17.428C20.3591 17.4366 20.1686 17.3962 19.9971 17.3105L14.875 14.75V10.25Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M1.375 8C1.375 7.40326 1.61205 6.83097 2.03401 6.40901C2.45597 5.98705 3.02826 5.75 3.625 5.75H12.625C13.2217 5.75 13.794 5.98705 14.216 6.40901C14.6379 6.83097 14.875 7.40326 14.875 8V17C14.875 17.5967 14.6379 18.169 14.216 18.591C13.794 19.0129 13.2217 19.25 12.625 19.25H3.625C3.02826 19.25 2.45597 19.0129 2.03401 18.591C1.61205 18.169 1.375 17.5967 1.375 17V8Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                {:else}
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M14.875 11.375V10.25L19.9971 7.68951C20.1686 7.60383 20.3591 7.56338 20.5506 7.572C20.7421 7.58063 20.9282 7.63804 21.0913 7.73879C21.2544 7.83955 21.389 7.9803 21.4824 8.14769C21.5758 8.31509 21.6249 8.50357 21.625 8.69526V16.3048C21.6251 16.5392 21.5519 16.7677 21.4158 16.9585C21.2796 17.1493 21.0873 17.2928 20.8656 17.369" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        <path d="M9.25 5.75H12.625C13.2217 5.75 13.794 5.98705 14.216 6.40901C14.6379 6.83097 14.875 7.40326 14.875 8V11.375M14.875 15.875V17C14.875 17.5967 14.6379 18.169 14.216 18.591C13.794 19.0129 13.2217 19.25 12.625 19.25H3.625C3.02826 19.25 2.45597 19.0129 2.03401 18.591C1.61205 18.169 1.375 17.5967 1.375 17V8C1.375 7.40326 1.61205 6.83097 2.03401 6.40901C2.45597 5.98705 3.02826 5.75 3.625 5.75H4.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                {/if}
                            </div>
                            <div class="group-hover/btn-cam:block hidden absolute p-4 w-60 text-white text-center rounded-lg top-20 left-1/2 transform -translate-x-1/2 before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:left-0 before:top-0 before:rounded before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:left-0">
                                <div class="w-4 overflow-hidden inline-block absolute -top-3 left-1/2 transform -translate-x-1/2">
                                    <div class=" h-3 w-3 rotate-45 transform origin-bottom-left bg-contrast/80 backdrop-blur"></div>
                                </div>
                                <div class="relative z-10">
                                    <div class="italic mb-3 text-sm">Click on icon to turn {#if $requestedMicrophoneState && !$silentStore}OFF{:else}ON{/if} camera</div>
                                    {#if $streamableCollectionStore.size > 0 || $myCameraStore}
                                        <div class="relative self-end z-[300] bottom-6 md:bottom-4">
                                            {#if $myCameraStore}
                                                <MyCamera />
                                            {/if}
                                        </div>
                                    {/if}
                                    {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
                                        <button class="btn btn-sm btn-border btn-light block w-full text-center">
                                            Edit camera settings
                                        </button>
                                    {/if}
                                </div>
                            </div>
                        </div>
                    {/if}
                    <!-- NAV : CAMERA END -->
                </div>
            </div>
        </div>
    </div>
    <div class="justify-self-end" transition:fly={{delay: 1500, y: -200, duration: 1500 }}>
        <div class="flex">
            {#if $inviteUserActivated}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div>
                    <div class="flex items-center mr-4">
                        <div class="bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-lg last:rounded-r-lg ">
                            <button
                                    in:fly={{}}
                                    on:dragstart|preventDefault={noDrag}
                                    on:click={() => analyticsClient.openInvite()}
                                    on:click={() => showMenuItem(SubMenusInterface.invite)}
                                    class="btn btn-secondary rounded h-12"
                            >
                                {$LL.menu.sub.invite()}
                            </button>
                        </div>
                    </div>
                </div>
            {/if}
            {#if $mapEditorActivated || $userHasAccessToBackOfficeStore}
                <div class="flex items-center relative">
                    <div class="group bg-contrast/80 backdrop-blur rounded-lg h-16 p-2 mr-4" on:click={() =>
				adminMenuIsDropped = !adminMenuIsDropped} on:click|preventDefault={close} on:blur={() => adminMenuIsDropped = false } tabindex="0">
                        <div class="flex items-center h-full group-hover:bg-white/10 transition-all group-hover:rounded">
                            <div class="px-2 m-auto">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 19H3C2.46957 19 1.96086 18.7893 1.58579 18.4142C1.21071 18.0391 1 17.5304 1 17V3C1 2.46957 1.21071 1.96086 1.58579 1.58579C1.96086 1.21071 2.46957 1 3 1H17C17.5304 1 18.0391 1.21071 18.4142 1.58579C18.7893 1.96086 19 2.46957 19 3V10M1 8H19M8 1V19M17.001 19C16.4706 19 15.9619 18.7893 15.5868 18.4142C15.2117 18.0391 15.001 17.5304 15.001 17C15.001 16.4696 15.2117 15.9609 15.5868 15.5858C15.9619 15.2107 16.4706 15 17.001 15M17.001 19C17.5314 19 18.0401 18.7893 18.4152 18.4142C18.7903 18.0391 19.001 17.5304 19.001 17C19.001 16.4696 18.7903 15.9609 18.4152 15.5858C18.0401 15.2107 17.5314 15 17.001 15M17.001 19V20.5M17.001 15V13.5M20.032 15.25L18.733 16M15.27 18L13.97 18.75M13.97 15.25L15.27 16M18.733 18L20.033 18.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </svg>
                            </div>
                            <div class="m-auto pt-1">
                                <div class="font-bold text-white leading-3">Admin menu</div>
                            </div>
                            <div class="m-auto pl-4 pr-6">
                                <svg class="transition-all" class:rotate-180={adminMenuIsDropped} width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 1L7 7L13 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    </div>
                    <div  class="absolute mt-2 top-16 right-0 bg-contrast/80 backdrop-blur rounded-lg py-2 w-full text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-4 before:right-6 before:border-solid before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all {adminMenuIsDropped ? '' : '-translate-y-4 opacity-0 '}">
                        <ul class="p-0 m-0">
                            {#if $mapEditorActivated}
                                <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold" on:click={() => toggleMapEditorMode()}>
                                    <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M12.5 3.5L16.5 7.5M10 6L5 1L1 5L6 10M5 6L3.5 7.5M14 10L19 15L15 19L10 14M14 15L12.5 16.5M1 19H5L18 6C18.5304 5.46957 18.8284 4.75015 18.8284 4C18.8284 3.24985 18.5304 2.53043 18 2C17.4696 1.46957 16.7501 1.17157 16 1.17157C15.2499 1.17157 14.5304 1.46957 14 2L1 15V19Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    </div>
                                    <div>Map editor</div>
                                </li>
                            {/if}
                            {#if $userHasAccessToBackOfficeStore}
                                <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold" on:click={() => openBo()}>
                                    <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                        <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M3 1V5M3 9V17M9 1V11M9 15V17M15 1V2M15 6V17M1 5H5V9H1V5ZM7 11H11V15H7V11ZM13 2H17V6H13V2Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                        </svg>
                                    </div>
                                    <div>Back-office</div>
                                </li>
                            {/if}
                            <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold">
                                <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"
                                         xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.5 3.5L16.5 7.5M10 6L5 1L1 5L6 10M5 6L3.5 7.5M14 10L19 15L15 19L10 14M14 15L12.5 16.5M1 19H5L18 6C18.5304 5.46957 18.8284 4.75015 18.8284 4C18.8284 3.24985 18.5304 2.53043 18 2C17.4696 1.46957 16.7501 1.17157 16 1.17157C15.2499 1.17157 14.5304 1.46957 14 2L1 15V19Z"
                                              stroke="white" stroke-width="2" stroke-linecap="round"
                                              stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <div>Envoyer message global</div>
                            </li>
                            <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold">
                                <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M12.5 3.5L16.5 7.5M10 6L5 1L1 5L6 10M5 6L3.5 7.5M14 10L19 15L15 19L10 14M14 15L12.5 16.5M1 19H5L18 6C18.5304 5.46957 18.8284 4.75015 18.8284 4C18.8284 3.24985 18.5304 2.53043 18 2C17.4696 1.46957 16.7501 1.17157 16 1.17157C15.2499 1.17157 14.5304 1.46957 14 2L1 15V19Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    </svg>
                                </div>
                                <div>Utiliser le mégaphone</div>
                            </li>
                        </ul>
                    </div>
                </div>
            {/if}
            <div class="flex items-center relative">
                <div class="group bg-contrast/80 backdrop-blur rounded-lg h-16 p-2" on:click={() => profileMenuIsDropped = !profileMenuIsDropped} tabindex="0">
                    <div class="flex items center h-full group-hover:bg-white/10 transition-all group-hover:rounded">
                        <div class="px-2 m-auto">
                            <Woka userId={-1} placeholderSrc="" customWidth="42px" customHeight="42px" />
                        </div>
                        <div class="m-auto pt-1">
                            <div class="font-bold text-white leading-3">Hugo</div>
                            <div class="text-xs text-white/50">Edit preferences</div>
                        </div>
                        <div class="m-auto pl-4 pr-6">
                            <svg class="transition-all" class:rotate-180={profileMenuIsDropped} width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L7 7L13 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                </div>
                <div class={`absolute mt-2 top-16 bg-contrast/80 backdrop-blur rounded-lg py-2 w-full text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-4 before:right-6 before:border-solid before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 transition-all ${profileMenuIsDropped ? "" : "-translate-y-4 opacity-0 "}`}>
                    <ul class="p-0 m-0 list-none">
                        <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold" on:click={() => openEditNameScene()}>
                            <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.224 22.132C5.55401 21.0336 6.22929 20.0709 7.14966 19.3866C8.07003 18.7024 9.18646 18.333 10.3333 18.3333H15.6667C16.815 18.3329 17.9328 18.7032 18.8538 19.389C19.7749 20.0749 20.45 21.0397 20.7787 22.14M1 13C1 14.5759 1.31039 16.1363 1.91345 17.5922C2.5165 19.0481 3.40042 20.371 4.51472 21.4853C5.62902 22.5996 6.95189 23.4835 8.4078 24.0866C9.86371 24.6896 11.4241 25 13 25C14.5759 25 16.1363 24.6896 17.5922 24.0866C19.0481 23.4835 20.371 22.5996 21.4853 21.4853C22.5996 20.371 23.4835 19.0481 24.0866 17.5922C24.6896 16.1363 25 14.5759 25 13C25 11.4241 24.6896 9.86371 24.0866 8.4078C23.4835 6.95189 22.5996 5.62902 21.4853 4.51472C20.371 3.40042 19.0481 2.5165 17.5922 1.91345C16.1363 1.31039 14.5759 1 13 1C11.4241 1 9.86371 1.31039 8.4078 1.91345C6.95189 2.5165 5.62902 3.40042 4.51472 4.51472C3.40042 5.62902 2.5165 6.95189 1.91345 8.4078C1.31039 9.86371 1 11.4241 1 13ZM9 10.3333C9 11.3942 9.42143 12.4116 10.1716 13.1618C10.9217 13.9119 11.9391 14.3333 13 14.3333C14.0609 14.3333 15.0783 13.9119 15.8284 13.1618C16.5786 12.4116 17 11.3942 17 10.3333C17 9.27247 16.5786 8.25505 15.8284 7.50491C15.0783 6.75476 14.0609 6.33333 13 6.33333C11.9391 6.33333 10.9217 6.75476 10.1716 7.50491C9.42143 8.25505 9 9.27247 9 10.3333Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div>Edit profil</div>
                        </li>
                        <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold" on:click={() => openEditSkinScene}>
                            <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                <Woka userId={-1} placeholderSrc="" customWidth="26px" customHeight="26px" />
                            </div>
                            <div>Change skin</div>
                        </li>
                        <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all" on:click={() => openEditCompanionScene}>
                            <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                <Companion userId={-1} placeholderSrc="" width="26px" height="26px" />
                            </div>
                            <div>Add a companion</div>
                        </li>
                        <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold">
                            <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.46 18.846C6.44929 17.9127 3.92666 15.8324 2.43721 13.0545C0.947767 10.2765 0.611114 7.02411 1.5 4C4.61553 4.14257 7.66417 3.06658 10 1C12.3358 3.06658 15.3845 4.14257 18.5 4C19.1787 6.30911 19.1473 8.76894 18.41 11.06M13 17L15 19L19 15" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div>Achievement</div>
                        </li>
                        <li class="h-[1px] w-full bg-white/20 my-2"></li>
                        <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold" on:click={openEnableCameraScene}>
                            <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                <svg width="18" height="24" viewBox="0 0 18 24" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4.33334 16.6667L1.89384 20.7337C1.78779 20.9106 1.73057 21.1126 1.72801 21.3189C1.72546 21.5252 1.77766 21.7285 1.8793 21.908C1.98093 22.0876 2.12836 22.237 2.30656 22.341C2.48476 22.445 2.68735 22.4998 2.89367 22.5H15.1063C15.3127 22.4998 15.5152 22.445 15.6934 22.341C15.8716 22.237 16.0191 22.0876 16.1207 21.908C16.2223 21.7285 16.2745 21.5252 16.272 21.3189C16.2694 21.1126 16.2122 20.9106 16.1062 20.7337L13.6667 16.6667M0.833336 9.66667C0.833336 10.7391 1.04457 11.8011 1.45499 12.7919C1.8654 13.7827 2.46695 14.683 3.2253 15.4414C3.98364 16.1997 4.88393 16.8013 5.87475 17.2117C6.86558 17.6221 7.92754 17.8333 9 17.8333C10.0725 17.8333 11.1344 17.6221 12.1253 17.2117C13.1161 16.8013 14.0164 16.1997 14.7747 15.4414C15.5331 14.683 16.1346 13.7827 16.545 12.7919C16.9554 11.8011 17.1667 10.7391 17.1667 9.66667C17.1667 8.5942 16.9554 7.53224 16.545 6.54142C16.1346 5.55059 15.5331 4.65031 14.7747 3.89196C14.0164 3.13362 13.1161 2.53206 12.1253 2.12165C11.1344 1.71124 10.0725 1.5 9 1.5C7.92754 1.5 6.86558 1.71124 5.87475 2.12165C4.88393 2.53206 3.98364 3.13362 3.2253 3.89196C2.46695 4.65031 1.8654 5.55059 1.45499 6.54142C1.04457 7.53224 0.833336 8.5942 0.833336 9.66667ZM5.5 9.66667C5.5 10.5949 5.86875 11.4852 6.52513 12.1415C7.18151 12.7979 8.07175 13.1667 9 13.1667C9.92826 13.1667 10.8185 12.7979 11.4749 12.1415C12.1313 11.4852 12.5 10.5949 12.5 9.66667C12.5 8.73841 12.1313 7.84817 11.4749 7.19179C10.8185 6.53542 9.92826 6.16667 9 6.16667C8.07175 6.16667 7.18151 6.53542 6.52513 7.19179C5.86875 7.84817 5.5 8.73841 5.5 9.66667Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div>Change cam / mic</div>
                        </li>
                        <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold" on:click={() => showMenuItem(SubMenusInterface.settings)}>
                            <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M9.90625 2.39625C10.4388 0.20125 13.5612 0.20125 14.0938 2.39625C14.1736 2.726 14.3303 3.03222 14.5509 3.29C14.7715 3.54778 15.0499 3.74982 15.3633 3.87968C15.6768 4.00955 16.0165 4.06356 16.3547 4.03734C16.693 4.01111 17.0203 3.90538 17.31 3.72875C19.2387 2.55375 21.4475 4.76125 20.2725 6.69125C20.0961 6.98082 19.9906 7.30792 19.9644 7.64597C19.9382 7.98401 19.9922 8.32346 20.1219 8.63672C20.2516 8.94999 20.4534 9.22822 20.7109 9.44882C20.9684 9.66941 21.2743 9.82613 21.6038 9.90625C23.7988 10.4388 23.7988 13.5612 21.6038 14.0938C21.274 14.1736 20.9678 14.3303 20.71 14.5509C20.4522 14.7715 20.2502 15.0499 20.1203 15.3633C19.9905 15.6768 19.9364 16.0165 19.9627 16.3547C19.9889 16.693 20.0946 17.0203 20.2713 17.31C21.4463 19.2387 19.2388 21.4475 17.3088 20.2725C17.0192 20.0961 16.6921 19.9906 16.354 19.9644C16.016 19.9382 15.6765 19.9922 15.3633 20.1219C15.05 20.2516 14.7718 20.4534 14.5512 20.7109C14.3306 20.9684 14.1739 21.2743 14.0938 21.6038C13.5612 23.7988 10.4388 23.7988 9.90625 21.6038C9.82635 21.274 9.66972 20.9678 9.44911 20.71C9.2285 20.4522 8.95014 20.2502 8.63669 20.1203C8.32323 19.9905 7.98354 19.9364 7.64527 19.9627C7.30699 19.9889 6.97969 20.0946 6.69 20.2713C4.76125 21.4463 2.5525 19.2388 3.7275 17.3088C3.90388 17.0192 4.00944 16.6921 4.0356 16.354C4.06177 16.016 4.0078 15.6765 3.87809 15.3633C3.74838 15.05 3.54658 14.7718 3.28909 14.5512C3.03161 14.3306 2.7257 14.1739 2.39625 14.0938C0.20125 13.5612 0.20125 10.4388 2.39625 9.90625C2.726 9.82635 3.03222 9.66972 3.29 9.44911C3.54778 9.2285 3.74982 8.95014 3.87968 8.63669C4.00955 8.32323 4.06356 7.98354 4.03734 7.64527C4.01111 7.30699 3.90538 6.97969 3.72875 6.69C2.55375 4.76125 4.76125 2.5525 6.69125 3.7275C7.94125 4.4875 9.56125 3.815 9.90625 2.39625Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M8.25 12C8.25 12.9946 8.64509 13.9484 9.34835 14.6517C10.0516 15.3549 11.0054 15.75 12 15.75C12.9946 15.75 13.9484 15.3549 14.6517 14.6517C15.3549 13.9484 15.75 12.9946 15.75 12C15.75 11.0054 15.3549 10.0516 14.6517 9.34835C13.9484 8.64509 12.9946 8.25 12 8.25C11.0054 8.25 10.0516 8.64509 9.34835 9.34835C8.64509 10.0516 8.25 11.0054 8.25 12Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div>Other settings</div>
                        </li>
                    </ul>
                </div>
            </div>
        </div>
    </div>
</div>
{#if $emoteMenuSubStore}
    <div
            class="flex justify-center m-auto absolute left-0 right-0 top-24 w-auto z-50"
    >
        <div class="bottom-action-bar bg-contrast/80 transition-all backdrop-blur rounded-lg pl-4 flex flex-col items-stretch items-center pointer-events-auto justify-center m-auto bottom-6 md:bottom-4 z-[251] transition-transform duration-300 sm:flex-row">
            <div class="bottom-action-section flex animate flex-row flex items-center">
                {#each [...$emoteDataStore.keys()] as key}
                    <div class="transition-all bottom-action-button">
                        <button
                                on:click={() => {
				clickEmoji(key);
				}}
                                id={`button-${$emoteDataStore.get(key)?.name}`}
                                class="emoji py-4 px-2 hover:bg-white/20 block m-0 rounded-none"
                                class:focus={$emoteMenuStore && $emoteMenuSubCurrentEmojiSelectedStore === key}
                        >
				<span class="emoji" style="margin:auto" id={`icon-${$emoteDataStore.get(key)?.name}`}>
				{$emoteDataStore.get(key)?.emoji}
				</span>
                            {#if !isMobile}
                                <span class="text-white/50 font-xxs pl-2">{key}</span>
                            {/if}
                        </button>
                    </div>
                {/each}
                <div class="transition-all bottom-action-button flex items-center h-full">
                    <button on:click={() =>
					analyticsClient.editEmote()} on:click|preventDefault={edit}>
                        {#if $emoteDataStoreLoading}
                            <div class="rounded-lg bg-dark text-xs">
                                <!-- loading animation -->
                                <div class="loading-group">
                                    <span class="loading-dot"></span>
                                    <span class="loading-dot"></span>
                                    <span class="loading-dot"></span>
                                </div>
                            </div>
                        {:else}
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <g>
                                    <path d="M12 5V19M5 12H19" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </g>
                            </svg>
                        {/if}
                    </button>
                </div>
                <div class="transition-all bottom-action-button flex items-center bg-contrast rounded-r-lg h-full">
                    <button on:click|preventDefault={close}>
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <g>
                                <path d="M18 6L6 18M6 6L18 18" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </g>
                        </svg>
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}
<style lang="scss">
  @import "../../style/breakpoints.scss";
  * {
    font-family: 'Roboto Condensed';
  }
  button {
    justify-content: center;
  }
  .animated {
    transition-property: transform;
    transition-duration: 0.5s;
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