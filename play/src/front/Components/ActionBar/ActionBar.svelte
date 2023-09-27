<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from "svelte-feather-icons";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { writable } from "svelte/store";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import {
        cameraListStore,
        localStreamStore,
        microphoneListStore,
        speakerListStore,
        requestedCameraState,
        requestedMicrophoneState,
        silentStore,
        speakerSelectedStore,
        requestedMicrophoneDeviceIdStore,
        requestedCameraDeviceIdStore,
        usedCameraDeviceIdStore,
        usedMicrophoneDeviceIdStore,
        streamingMegaphoneStore,
        isSpeakerStore,
    } from "../../Stores/MediaStore";
    import cameraImg from "../images/camera.png";
    import cameraOffImg from "../images/camera-off.png";
    import microphoneImg from "../images/microphone.png";
    import microphoneOffImg from "../images/microphone-off.png";
    import layoutPresentationImg from "../images/layout-presentation.png";
    import layoutChatImg from "../images/layout-chat.png";
    import bubbleImg from "../images/bubble-talk.png";
    import followImg from "../images/follow.png";
    import lockOpenImg from "../images/lock-opened.png";
    import lockCloseImg from "../images/lock-closed.png";
    import mapBuilder from "../images/maps-builder.png";
    import screenshareOn from "../images/screenshare-on.png";
    import screenshareOff from "../images/screenshare-off.png";
    import screenshareOffAlt from "../images/screenshare-off-alt.png";
    import emojiPickOn from "../images/emoji-on.png";
    import closeImg from "../images/close.png";
    import penImg from "../images/pen.png";
    import hammerImg from "../images/hammer.png";
    import megaphoneImg from "../images/megaphone.svg";
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
        subMenusStore,
        additionnalButtonsMenu,
        addClassicButtonActionBarEvent,
        addActionButtonActionBarEvent,
        mapEditorActivated,
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
    import { StringUtils } from "../../Utils/StringUtils";
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

    const menuImg = gameManager.currentStartedRoom?.miniLogo ?? WorkAdventureImg;

    let cameraActive = false;
    let microphoneActive = false;
    let profileIsDropped = false;
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

    function showInvite() {
        modalVisibilityStore.set(false);

        const inviteMenu = subMenusStore.findByKey(SubMenusInterface.invite);
        if ($menuVisiblilityStore && activeSubMenuStore.isActive(inviteMenu)) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
            return;
        }
        activeSubMenuStore.activateByMenuItem(inviteMenu);
        menuVisiblilityStore.set(true);

        resetChatVisibility();
        resetModalVisibility();
    }

    function showMenu() {
        const profileMenu = subMenusStore.findByKey(SubMenusInterface.profile);
        if ($menuVisiblilityStore && activeSubMenuStore.isActive(profileMenu)) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.activateByIndex(0);
            return;
        }
        activeSubMenuStore.activateByMenuItem(profileMenu);
        menuVisiblilityStore.set(true);

        resetChatVisibility();
        resetModalVisibility();
    }

    function openBo() {
        window.open(ADMIN_URL, "_blank");
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
    <div class="justify-self-start">
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
                on:click={() => analyticsClient.openedChat()}
                on:click={toggleChat}
                class="flex relative"
        >
            <Tooltip text={$LL.actionbar.chat()} />

            <div class="group/btn-chat relative bg-contrast/80 transition-all backdrop-blur rounded-xl p-2 aspect-square">
                <div class="h-12 w-12 rounded-lg group-hover/btn-chat:bg-white/10 aspect-square flex items-center transition-all">
                    <svg class="m-auto" width="20" height="18" viewBox="0 0 20 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M1 17L2.3 13.1C1.17644 11.4383 0.769993 9.47043 1.15622 7.56232C1.54244 5.65421 2.69506 3.93569 4.39977 2.72629C6.10447 1.51689 8.24526 0.898916 10.4241 0.987258C12.6029 1.0756 14.6715 1.86425 16.2453 3.20658C17.819 4.5489 18.7909 6.35356 18.9801 8.285C19.1693 10.2164 18.563 12.1432 17.2739 13.7071C15.9848 15.271 14.1007 16.3656 11.9718 16.7874C9.84293 17.2091 7.6142 16.9293 5.7 16L1 17Z" stroke="white" stroke-width="1.83333" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
                {#if $chatZoneLiveStore || $peerStore.size > 0}
                    <div>
                                <span
                                        class={`w-4 h-4 ${
                                        $peerStore.size > 0 ? "bg-success" : "bg-danger"
                                    } block rounded-full absolute -top-1 -left-1 animate-ping`}
                                />
                        <span
                                class={`w-3 h-3 ${
                                        $peerStore.size > 0 ? "bg-success" : "bg-danger"
                                    } block rounded-full absolute -top-0.5 -left-0.5`}
                        />
                    </div>
                {:else if $totalMessagesToSee > 0}
                    <div class="absolute -top-2 -right-2 aspect-square flex w-5 h-5 items-center justify-center text-sm font-bold leading-none text-contrast bg-success rounded-full ">
                        {$totalMessagesToSee}
                    </div>
                {/if}
            </div>
        </div>
    </div>
    <div class="justify-self-center">
        <div class="flex relative">
            <div class={menuExpand ? "group menuExpand" : ""}>
                <div class="flex items-center mr-4 absolute right-28">
                    {#if menuExpand}
                        <div class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-xl last:rounded-r-xl  aspect-square">
                            <div class="h-12 w-12 rounded-lg group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all">
                                <svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1.5 3.75C1.5 3.15326 1.73705 2.58097 2.15901 2.15901C2.58097 1.73705 3.15326 1.5 3.75 1.5H6C6.59674 1.5 7.16903 1.73705 7.59099 2.15901C8.01295 2.58097 8.25 3.15326 8.25 3.75V4.875C8.25 5.47174 8.01295 6.04403 7.59099 6.46599C7.16903 6.88795 6.59674 7.125 6 7.125H3.75C3.15326 7.125 2.58097 6.88795 2.15901 6.46599C1.73705 6.04403 1.5 5.47174 1.5 4.875V3.75Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M1.5 13.875C1.5 13.2783 1.73705 12.706 2.15901 12.284C2.58097 11.8621 3.15326 11.625 3.75 11.625H6C6.59674 11.625 7.16903 11.8621 7.59099 12.284C8.01295 12.706 8.25 13.2783 8.25 13.875V17.25C8.25 17.8467 8.01295 18.419 7.59099 18.841C7.16903 19.2629 6.59674 19.5 6 19.5H3.75C3.15326 19.5 2.58097 19.2629 2.15901 18.841C1.73705 18.419 1.5 17.8467 1.5 17.25V13.875Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12.75 3.75C12.75 3.15326 12.9871 2.58097 13.409 2.15901C13.831 1.73705 14.4033 1.5 15 1.5H17.25C17.8467 1.5 18.419 1.73705 18.841 2.15901C19.2629 2.58097 19.5 3.15326 19.5 3.75V7.125C19.5 7.72174 19.2629 8.29403 18.841 8.71599C18.419 9.13795 17.8467 9.375 17.25 9.375H15C14.4033 9.375 13.831 9.13795 13.409 8.71599C12.9871 8.29403 12.75 7.72174 12.75 7.125V3.75Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                    <path d="M12.75 16.125C12.75 15.5283 12.9871 14.956 13.409 14.534C13.831 14.1121 14.4033 13.875 15 13.875H17.25C17.8467 13.875 18.419 14.1121 18.841 14.534C19.2629 14.956 19.5 15.5283 19.5 16.125V17.25C19.5 17.8467 19.2629 18.419 18.841 18.841C18.419 19.2629 17.8467 19.5 17.25 19.5H15C14.4033 19.5 13.831 19.2629 13.409 18.841C12.9871 18.419 12.75 17.8467 12.75 17.25V16.125Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </div>
                        <div class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-xl last:rounded-r-xl  aspect-square">
                            <div class="h-12 w-12 rounded-lg group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all">
                                <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5.875 3.625C5.875 4.22174 5.63795 4.79403 5.21599 5.21599C4.79403 5.63795 4.22174 5.875 3.625 5.875C3.02826 5.875 2.45597 5.63795 2.03401 5.21599C1.61205 4.79403 1.375 4.22174 1.375 3.625C1.375 3.02826 1.61205 2.45597 2.03401 2.03401C2.45597 1.61205 3.02826 1.375 3.625 1.375C4.22174 1.375 4.79403 1.61205 5.21599 2.03401C5.63795 2.45597 5.875 3.02826 5.875 3.625ZM5.875 3.625L16.5625 3.625C17.6068 3.625 18.6083 4.03984 19.3467 4.77827C20.0852 5.51669 20.5 6.51821 20.5 7.5625C20.5 8.60679 20.0852 9.60831 19.3467 10.3467C18.6083 11.0852 17.6068 11.5 16.5625 11.5H6.4375C5.39321 11.5 4.39169 11.9148 3.65327 12.6533C2.91484 13.3917 2.5 14.3932 2.5 15.4375C2.5 16.4818 2.91484 17.4833 3.65327 18.2217C4.39169 18.9602 5.39321 19.375 6.4375 19.375H21.625M21.625 19.375L18.25 16M21.625 19.375L18.25 22.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>

                            </div>
                        </div>
                        <div class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-xl last:rounded-r-xl  aspect-square">
                            <div class="h-12 w-12 rounded-lg group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all">
                                <svg width="19" height="23" viewBox="0 0 19 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M5 10.375V5.875C5 4.68153 5.47411 3.53693 6.31802 2.69302C7.16193 1.84911 8.30653 1.375 9.5 1.375C10.6935 1.375 11.8381 1.84911 12.682 2.69302C13.5259 3.53693 14 4.68153 14 5.875V10.375M1.625 12.625C1.625 12.0283 1.86205 11.456 2.28401 11.034C2.70597 10.6121 3.27826 10.375 3.875 10.375H15.125C15.7217 10.375 16.294 10.6121 16.716 11.034C17.1379 11.456 17.375 12.0283 17.375 12.625V19.375C17.375 19.9717 17.1379 20.544 16.716 20.966C16.294 21.3879 15.7217 21.625 15.125 21.625H3.875C3.27826 21.625 2.70597 21.3879 2.28401 20.966C1.86205 20.544 1.625 19.9717 1.625 19.375V12.625ZM8.375 16C8.375 16.2984 8.49353 16.5845 8.7045 16.7955C8.91548 17.0065 9.20163 17.125 9.5 17.125C9.79837 17.125 10.0845 17.0065 10.2955 16.7955C10.5065 16.5845 10.625 16.2984 10.625 16C10.625 15.7016 10.5065 15.4155 10.2955 15.2045C10.0845 14.9935 9.79837 14.875 9.5 14.875C9.20163 14.875 8.91548 14.9935 8.7045 15.2045C8.49353 15.4155 8.375 15.7016 8.375 16Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </div>
                        <div class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-xl last:rounded-r-xl  aspect-square">
                            <div class="h-12 w-12 rounded-lg group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all">
                                <svg width="23" height="21" viewBox="0 0 23 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M21.625 10.5V13.875C21.625 14.1734 21.5065 14.4595 21.2955 14.6705C21.0845 14.8815 20.7984 15 20.5 15H2.5C2.20163 15 1.91548 14.8815 1.7045 14.6705C1.49353 14.4595 1.375 14.1734 1.375 13.875V2.625C1.375 2.32663 1.49353 2.04048 1.7045 1.82951C1.91548 1.61853 2.20163 1.5 2.5 1.5H12.625M5.875 19.5H17.125M8.125 15V19.5M14.875 15V19.5M17.125 1.5H21.625M21.625 1.5V6M21.625 1.5L16 7.125" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                        </div>
                    {/if}
                    <div class="group/btn-more bg-contrast/80 transition-all backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-xl last:rounded-r-xl  aspect-square">
                        <div class="h-12 w-12 rounded-lg group-hover/btn-more:bg-white/10 aspect-square flex items-center justify-center transition-all" on:click={() => menuExpand = !menuExpand}>
                            <svg class:rotate-180={menuExpand} class="block" width="9" height="17" viewBox="0 0 9 17" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M7.875 15.25L1.125 8.5L7.875 1.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                    </div>
                </div>
            </div>
            <div>
                <!-- ACTION WRAPPER : CAM & MIC -->
                <div class="flex items-center">
                    {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore}
                        <!-- NAV : MICROPHONE START -->
                        {#if $myMicrophoneStore}
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div class="relative">
                                <div
                                        class="group/btn-mic peer relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-xl last:rounded-r-xl aspect-square"
                                        on:click={() => analyticsClient.microphone()}
                                        on:click={microphoneClick}
                                        class:disabled={!$requestedMicrophoneState || $silentStore}
                                >
                                    <Tooltip text={$LL.actionbar.microphone()} />

                                    <div
                                            class="h-12 w-12 p-1 m-0 rounded-lg group-[.disabled]/btn-mic:bg-danger hover:bg-white/10 flex items-center justify-center transition-all"
                                            class:border-top-light={$requestedMicrophoneState}>
                                        {#if $requestedMicrophoneState && !$silentStore}
                                            <svg draggable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 11.1451 14.5194 12.0036 13.8865 12.6365C13.2536 13.2694 12.3951 13.625 11.5 13.625C10.6049 13.625 9.74645 13.2694 9.11351 12.6365C8.48058 12.0036 8.125 11.1451 8.125 10.25V4.625Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M3.625 10.25C3.625 12.3386 4.45469 14.3416 5.93153 15.8185C7.40838 17.2953 9.41142 18.125 11.5 18.125C13.5886 18.125 15.5916 17.2953 17.0685 15.8185C18.5453 14.3416 19.375 12.3386 19.375 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                                            </svg>
                                        {:else}
                                            <svg draggable="false" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M8.125 4.625C8.125 3.72989 8.48058 2.87145 9.11351 2.23851C9.74645 1.60558 10.6049 1.25 11.5 1.25C12.3951 1.25 13.2536 1.60558 13.8865 2.23851C14.5194 2.87145 14.875 3.72989 14.875 4.625V10.25C14.875 10.5832 14.8258 10.9145 14.7287 11.2332M12.4788 13.4832C11.9744 13.6361 11.4412 13.6687 10.922 13.5784C10.4028 13.4882 9.9119 13.2776 9.4887 12.9635C9.06549 12.6494 8.72171 12.2406 8.48491 11.7698C8.2481 11.299 8.12484 10.7793 8.125 10.2522V9.12725" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M3.625 10.25C3.62475 11.6713 4.00915 13.0661 4.73742 14.2866C5.46568 15.5071 6.51068 16.5077 7.76159 17.1824C9.01249 17.8571 10.4227 18.1807 11.8426 18.1189C13.2625 18.0571 14.6392 17.6121 15.8267 16.8313M18.0767 14.5813C18.9248 13.2961 19.3756 11.78ƒbtn)97 19.3727 10.25" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M7 22.625H16" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                                <path d="M11.5 18.125V22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            </svg>
                                        {/if}
                                    </div>

                                    {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 1}
                                        <button
                                                class="microphone absolute text-light-purple focus:outline-none m-0"
                                                on:click|stopPropagation|preventDefault={() =>
                            (microphoneActive = !microphoneActive)}
                                        >
                                            {#if microphoneActive}
                                                <ChevronDownIcon size="13" />
                                            {:else}
                                                <ChevronUpIcon size="13" />
                                            {/if}
                                        </button>

                                        <div
                                                class={`wa-dropdown-menu ${microphoneActive ? "" : "invisible"}`}
                                                style="bottom: 15px;right: 0;"
                                                on:mouseleave={() => (microphoneActive = false)}
                                        >
                                            {#if $microphoneListStore.length > 0}
                                                <!-- microphone list -->
                                                <span class="underline font-bold text-xs p-1"
                                                >{$LL.actionbar.subtitle.microphone()} 🎙️</span
                                                >
                                                {#each $microphoneListStore as microphone}
                                <span
                                        class="wa-dropdown-item"
                                        on:click={() => {
                                        analyticsClient.selectMicrophone();
                                    }}
                                        on:click|stopPropagation|preventDefault={() =>
                                        selectMicrophone(microphone.deviceId)}
                                >
                                    {StringUtils.normalizeDeviceName(microphone.label)}
                                    {#if $usedMicrophoneDeviceIdStore === microphone.deviceId}
                                        <CheckIcon size="13" />
                                    {/if}
                                </span>
                                                {/each}
                                            {/if}

                                            <!-- speaker list -->
                                            {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
                            <span class="underline font-bold text-xs p-1"
                            >{$LL.actionbar.subtitle.speaker()} 🔈</span
                            >
                                                {#each $speakerListStore as speaker}
                                <span
                                        class="wa-dropdown-item"
                                        on:click={() => {
                                        analyticsClient.selectSpeaker();
                                    }}
                                        on:click|stopPropagation|preventDefault={() =>
                                        selectSpeaker(speaker.deviceId)}
                                >
                                    {StringUtils.normalizeDeviceName(speaker.label)}
                                    {#if $speakerSelectedStore === speaker.deviceId}
                                        <CheckIcon size="13" />
                                    {/if}
                                </span>
                                                {/each}
                                            {/if}
                                        </div>
                                    {/if}
                                </div>
                                <div class="peer-hover:block hidden absolute p-4 w-60 text-white text-center rounded-lg top-20 left-1/2 transform -translate-x-1/2 before:content-[''] before:absolute before:w-full before:h-full before:z-1 before:bg-secondary before:left-0 before:top-0 before:rounded-lg before:bg-contrast/80 before:backdrop-blur after:content-[''] after:absolute after:z-0 after:w-full after:bg-transparent after:h-full after:-top-4 after:left-0">
                                    <div class="w-4 overflow-hidden inline-block absolute -top-3 left-1/2 transform -translate-x-1/2">
                                        <div class=" h-3 w-3 rotate-45 transform origin-bottom-left bg-contrast/80 backdrop-blur"></div>
                                    </div>
                                    <div class="relative z-10">
                                        <div class="italic mb-3 text-sm">Click on icon to turn {#if $requestedMicrophoneState && !$silentStore}OFF{:else}ON{/if} microphone</div>
                                        <div class="w-full h-6 bg-secondary"></div>
                                        <a href="#" class="btn btn-xs btn-border btn-light">
                                            <div class="btn-label">
                                                TEST
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        {/if}
                    {/if}
                    <!-- NAV : MICROPHONE END -->

                    <!-- NAV : CAMERA START -->
                    {#if $myCameraStore}
                        <div class="relative">
                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                            <div class="group/btn-cam relative bg-contrast/80 backdrop-blur p-2 pr-0 last:pr-2 first:rounded-l-xl last:rounded-r-xl aspect-square" on:click={() => analyticsClient.camera()} on:click={cameraClick} class:disabled={!$requestedCameraState || $silentStore}>
                                <Tooltip text={$LL.actionbar.camera()} />
                                <div class="h-12 w-12 p-1 m-0 rounded-lg group-[.disabled]/btn-cam:bg-danger hover:bg-white/10 flex items-center justify-center transition-all" class:border-top-light={$requestedCameraState}>
                                    {#if $requestedCameraState && !$silentStore}
                                        <svg
                                                draggable="false"
                                                width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M14.875 10.25L19.9971 7.68951C20.1686 7.60383 20.3591 7.56338 20.5506 7.572C20.7421 7.58063 20.9282 7.63804 21.0913 7.73879C21.2544 7.83955 21.389 7.9803 21.4824 8.14769C21.5758 8.31509 21.6249 8.50357 21.625 8.69526V16.3048C21.6249 16.4965 21.5758 16.6849 21.4824 16.8523C21.389 17.0197 21.2544 17.1605 21.0913 17.2612C20.9282 17.362 20.7421 17.4194 20.5506 17.428C20.3591 17.4366 20.1686 17.3962 19.9971 17.3105L14.875 14.75V10.25Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M1.375 8C1.375 7.40326 1.61205 6.83097 2.03401 6.40901C2.45597 5.98705 3.02826 5.75 3.625 5.75H12.625C13.2217 5.75 13.794 5.98705 14.216 6.40901C14.6379 6.83097 14.875 7.40326 14.875 8V17C14.875 17.5967 14.6379 18.169 14.216 18.591C13.794 19.0129 13.2217 19.25 12.625 19.25H3.625C3.02826 19.25 2.45597 19.0129 2.03401 18.591C1.61205 18.169 1.375 17.5967 1.375 17V8Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    {:else}
                                        <svg
                                                draggable="false"
                                                width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1.375 2.375L21.625 22.625" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M14.875 11.375V10.25L19.9971 7.68951C20.1686 7.60383 20.3591 7.56338 20.5506 7.572C20.7421 7.58063 20.9282 7.63804 21.0913 7.73879C21.2544 7.83955 21.389 7.9803 21.4824 8.14769C21.5758 8.31509 21.6249 8.50357 21.625 8.69526V16.3048C21.6251 16.5392 21.5519 16.7677 21.4158 16.9585C21.2796 17.1493 21.0873 17.2928 20.8656 17.369" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                            <path d="M9.25 5.75H12.625C13.2217 5.75 13.794 5.98705 14.216 6.40901C14.6379 6.83097 14.875 7.40326 14.875 8V11.375M14.875 15.875V17C14.875 17.5967 14.6379 18.169 14.216 18.591C13.794 19.0129 13.2217 19.25 12.625 19.25H3.625C3.02826 19.25 2.45597 19.0129 2.03401 18.591C1.61205 18.169 1.375 17.5967 1.375 17V8C1.375 7.40326 1.61205 6.83097 2.03401 6.40901C2.45597 5.98705 3.02826 5.75 3.625 5.75H4.75" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                        </svg>
                                    {/if}
                                </div>

                                {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
                                    <button class="camera absolute text-light-purple focus:outline-none m-0" on:click|stopPropagation|preventDefault={() => (cameraActive = !cameraActive)}>
                                        {#if cameraActive}
                                            <ChevronDownIcon size="13" />
                                        {:else}
                                            <ChevronUpIcon size="13" />
                                        {/if}
                                    </button>

                                    <!-- camera list -->
                                    <div class={`wa-dropdown-menu ${cameraActive ? "" : "invisible"}`} style="bottom: 15px;right: 0;" on:mouseleave={() => (cameraActive = false)}>
                                        {#each $cameraListStore as camera}
                                            <!-- svelte-ignore a11y-click-events-have-key-events -->
                                            <span class="wa-dropdown-item flex"
                                                  on:click={() => {
                                                    analyticsClient.selectCamera();
                                                }}
                                                  on:click|stopPropagation|preventDefault={() =>
                                                    selectCamera(camera.deviceId)
                                                }>
                                                {StringUtils.normalizeDeviceName(camera.label)}
                                                {#if $usedCameraDeviceIdStore === camera.deviceId}
                                                <CheckIcon size="13" class="ml-1" />
                                            {/if}
                                        </span>
                                        {/each}
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                    <!-- NAV : CAMERA END -->
                </div>
            </div>
        </div>
    </div>

    <div class="justify-self-end">
        <div class="flex items-center relative">
            <div class="group bg-contrast/80 backdrop-blur rounded-xl h-16 p-2" on:click={() => profileIsDropped = !profileIsDropped} on:blur={() => profileIsDropped = false } tabindex="0">
                <div class="flex items center h-full group-hover:bg-white/10 transition-all group-hover:rounded-lg">
                    <div class="px-2 m-auto">
                        <Woka userId={-1} placeholderSrc="" customWidth="42px" customHeight="42px" />
                    </div>
                    <div class="m-auto pt-1">
                        <div class="font-bold text-white leading-3">Hugo</div>
                        <div class="text-xs text-white/50">Edit preferences</div>
                    </div>
                    <div class="m-auto pl-4 pr-6 transition-all" class:rotate-180={profileIsDropped}>
                        <svg class="" width="14" height="8" viewBox="0 0 14 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M1 1L7 7L13 1" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                        </svg>
                    </div>
                </div>
            </div>
            <div  class={`absolute mt-2 top-16 bg-contrast/80 backdrop-blur rounded-xl py-2 w-full text-white before:content-[''] before:absolute before:w-0 before:h-0 before:-top-4 before:right-6 before:border-solid before:border-8 before:border-solid before:border-transparent before:border-b-contrast/80 ${profileIsDropped ? "" : "-translateY-4 opacity-0 "}`}>
                <ul class="p-0 m-0">
                    <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold">
                        <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                            <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M5.224 22.132C5.55401 21.0336 6.22929 20.0709 7.14966 19.3866C8.07003 18.7024 9.18646 18.333 10.3333 18.3333H15.6667C16.815 18.3329 17.9328 18.7032 18.8538 19.389C19.7749 20.0749 20.45 21.0397 20.7787 22.14M1 13C1 14.5759 1.31039 16.1363 1.91345 17.5922C2.5165 19.0481 3.40042 20.371 4.51472 21.4853C5.62902 22.5996 6.95189 23.4835 8.4078 24.0866C9.86371 24.6896 11.4241 25 13 25C14.5759 25 16.1363 24.6896 17.5922 24.0866C19.0481 23.4835 20.371 22.5996 21.4853 21.4853C22.5996 20.371 23.4835 19.0481 24.0866 17.5922C24.6896 16.1363 25 14.5759 25 13C25 11.4241 24.6896 9.86371 24.0866 8.4078C23.4835 6.95189 22.5996 5.62902 21.4853 4.51472C20.371 3.40042 19.0481 2.5165 17.5922 1.91345C16.1363 1.31039 14.5759 1 13 1C11.4241 1 9.86371 1.31039 8.4078 1.91345C6.95189 2.5165 5.62902 3.40042 4.51472 4.51472C3.40042 5.62902 2.5165 6.95189 1.91345 8.4078C1.31039 9.86371 1 11.4241 1 13ZM9 10.3333C9 11.3942 9.42143 12.4116 10.1716 13.1618C10.9217 13.9119 11.9391 14.3333 13 14.3333C14.0609 14.3333 15.0783 13.9119 15.8284 13.1618C16.5786 12.4116 17 11.3942 17 10.3333C17 9.27247 16.5786 8.25505 15.8284 7.50491C15.0783 6.75476 14.0609 6.33333 13 6.33333C11.9391 6.33333 10.9217 6.75476 10.1716 7.50491C9.42143 8.25505 9 9.27247 9 10.3333Z" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div>Edit profil</div>
                    </li>
                    <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold">
                        <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                            <Woka userId={-1} placeholderSrc="" customWidth="26px" customHeight="26px" />
                        </div>
                        <div>Change skin</div>
                    </li>
                    <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all">
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
                    <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold">
                        <div class="group-hover:mr-2 transition-all w-8 mr-1 text-center">
                            <svg width="18" height="24" viewBox="0 0 18 24" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4.33334 16.6667L1.89384 20.7337C1.78779 20.9106 1.73057 21.1126 1.72801 21.3189C1.72546 21.5252 1.77766 21.7285 1.8793 21.908C1.98093 22.0876 2.12836 22.237 2.30656 22.341C2.48476 22.445 2.68735 22.4998 2.89367 22.5H15.1063C15.3127 22.4998 15.5152 22.445 15.6934 22.341C15.8716 22.237 16.0191 22.0876 16.1207 21.908C16.2223 21.7285 16.2745 21.5252 16.272 21.3189C16.2694 21.1126 16.2122 20.9106 16.1062 20.7337L13.6667 16.6667M0.833336 9.66667C0.833336 10.7391 1.04457 11.8011 1.45499 12.7919C1.8654 13.7827 2.46695 14.683 3.2253 15.4414C3.98364 16.1997 4.88393 16.8013 5.87475 17.2117C6.86558 17.6221 7.92754 17.8333 9 17.8333C10.0725 17.8333 11.1344 17.6221 12.1253 17.2117C13.1161 16.8013 14.0164 16.1997 14.7747 15.4414C15.5331 14.683 16.1346 13.7827 16.545 12.7919C16.9554 11.8011 17.1667 10.7391 17.1667 9.66667C17.1667 8.5942 16.9554 7.53224 16.545 6.54142C16.1346 5.55059 15.5331 4.65031 14.7747 3.89196C14.0164 3.13362 13.1161 2.53206 12.1253 2.12165C11.1344 1.71124 10.0725 1.5 9 1.5C7.92754 1.5 6.86558 1.71124 5.87475 2.12165C4.88393 2.53206 3.98364 3.13362 3.2253 3.89196C2.46695 4.65031 1.8654 5.55059 1.45499 6.54142C1.04457 7.53224 0.833336 8.5942 0.833336 9.66667ZM5.5 9.66667C5.5 10.5949 5.86875 11.4852 6.52513 12.1415C7.18151 12.7979 8.07175 13.1667 9 13.1667C9.92826 13.1667 10.8185 12.7979 11.4749 12.1415C12.1313 11.4852 12.5 10.5949 12.5 9.66667C12.5 8.73841 12.1313 7.84817 11.4749 7.19179C10.8185 6.53542 9.92826 6.16667 9 6.16667C8.07175 6.16667 7.18151 6.53542 6.52513 7.19179C5.86875 7.84817 5.5 8.73841 5.5 9.66667Z" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                            </svg>
                        </div>
                        <div>Change cam / mic</div>
                    </li>
                    <li class="group flex px-4 py-2 items-center hover:bg-white/10 transition-all cursor-pointer text-sm font-bold">
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

{#if $emoteMenuSubStore}
    <div
        class="flex justify-center m-auto absolute left-0 right-0 bottom-0"
        style="margin-bottom: 4.5rem; height: auto;"
    >
        <div class="bottom-action-bar">
            <div class="bottom-action-section flex animate">
                {#each [...$emoteDataStore.keys()] as key}
                    <div class="transition-all bottom-action-button">
                        <button
                            on:click={() => {
                                clickEmoji(key);
                            }}
                            id={`button-${$emoteDataStore.get(key)?.name}`}
                            class="emoji"
                            class:focus={$emoteMenuStore && $emoteMenuSubCurrentEmojiSelectedStore === key}
                        >
                            <span class="emoji" style="margin:auto" id={`icon-${$emoteDataStore.get(key)?.name}`}>
                                {$emoteDataStore.get(key)?.emoji}
                            </span>
                            {#if !isMobile}
                                <span class="text-white">{key}</span>
                            {/if}
                        </button>
                    </div>
                {/each}

                <div class="transition-all bottom-action-button">
                    <button on:click={() => analyticsClient.editEmote()} on:click|preventDefault={edit}>
                        {#if $emoteDataStoreLoading}
                            <div class="rounded-lg bg-dark text-xs">
                                <!-- loading animation -->
                                <div class="loading-group">
                                    <span class="loading-dot" />
                                    <span class="loading-dot" />
                                    <span class="loading-dot" />
                                </div>
                            </div>
                        {:else}
                            <img
                                draggable="false"
                                src={penImg}
                                style="padding: 2px"
                                alt={$LL.menu.icon.open.openEmoji()}
                            />
                        {/if}
                    </button>
                </div>
                <div class="transition-all bottom-action-button">
                    <button on:click|preventDefault={close}>
                        <img
                            draggable="false"
                            src={closeImg}
                            style="padding: 4px"
                            alt={$LL.menu.icon.open.closeEmoji()}
                        />
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
