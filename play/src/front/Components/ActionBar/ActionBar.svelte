<script lang="ts">
    import { writable } from "svelte/store";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { AvailabilityStatus } from "@workadventure/messages";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import {
        availabilityStatusStore,
        cameraListStore,
        isSpeakerStore,
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
    import mapBuilder from "../images/maps-builder.svg";
    import screenshareOn from "../images/screenshare-on.png";
    import screenshareOff from "../images/screenshare-off.png";
    import emojiPickOn from "../images/emoji-on.png";
    import closeImg from "../images/close.png";
    import penImg from "../images/pen.png";
    import backOfficeImg from "../images/back-office.svg";
    import megaphoneImg from "../images/megaphone.svg";
    import WorkAdventureImg from "../images/icon-workadventure-white.png";
    import worldImg from "../images/world.svg";
    import calendarSvg from "../images/applications/outlook.svg";
    import todoListSvg from "../images/applications/todolist.png";
    import burgerMenuImg from "../images/menu.svg";
    import AppSvg from "../images/action-app.svg";
    import { LayoutMode } from "../../WebRtc/LayoutManager";
    import { embedScreenLayoutStore } from "../../Stores/EmbedScreensStore";
    import { followRoleStore, followStateStore, followUsersStore } from "../../Stores/FollowStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { currentPlayerGroupLockStateStore } from "../../Stores/CurrentPlayerGroupStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { chatVisibilityStore, chatZoneLiveStore } from "../../Stores/ChatStore";
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
        mapManagerActivated,
        menuVisiblilityStore,
        roomListActivated,
        screenSharingActivatedStore,
        SubMenusInterface,
        subMenusStore,
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
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { isActivatedStore as isCalendarActivatedStore, isCalendarVisibleStore } from "../../Stores/CalendarStore";
    import { isActivatedStore as isTodoListActivatedStore, isTodoListVisibleStore } from "../../Stores/TodoListStore";
    import { externalActionBarSvelteComponent } from "../../Stores/Utils/externalSvelteComponentStore";
    import { ADMIN_BO_URL } from "../../Enum/EnvironmentVariable";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import AvailabilityStatusComponent from "./AvailabilityStatus/AvailabilityStatus.svelte";
    import { IconCheck, IconChevronDown, IconChevronUp } from "@wa-icons";

    const menuImg = gameManager.currentStartedRoom?.miniLogo ?? WorkAdventureImg;

    let cameraActive = false;
    let microphoneActive = false;

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
        if (!ADMIN_BO_URL) {
            throw new Error("ADMIN_BO_URL not set");
        }
        const url = new URL(ADMIN_BO_URL, window.location.href);
        url.searchParams.set("playUri", window.location.href);
        window.open(url, "_blank");
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
        microphoneActive = false;
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

    const proximityChatRoom = gameManager.getCurrentGameScene().proximityChatRoom;
    const chatConnection = gameManager.chatConnection;

    const proximityChatRoomHasUnreadMessage = proximityChatRoom.hasUnreadMessages;

    const chatHasUnreadMessage = chatConnection.hasUnreadMessages;

    onMount(() => {
        resizeObserver.observe(mainHtmlDiv);
    });

    onDestroy(() => {
        resizeObserver.disconnect();
    });

    function buttonActionBarTrigger(id: string) {
        const button = $additionnalButtonsMenu.get(id) as AddButtonActionBarEvent;
        return iframeListener.sendButtonActionBarTriggered(button);
    }

    let mainHtmlDiv: HTMLDivElement;
    let isMobile = isMediaBreakpointUp("md");
    const resizeObserver = new ResizeObserver(() => {
        isMobile = isMediaBreakpointUp("md");
        if (isMobile) {
            mapEditorModeStore.set(false);
        }
    });

    function showRoomList() {
        resetChatVisibility();
        resetModalVisibility();

        roomListVisibilityStore.set(true);
    }

    const onClickOutside = () => {
        if ($emoteMenuSubStore) emoteMenuSubStore.closeEmoteMenu();
        if (appMenuOpened) appMenuOpened = false;
    };

    let isActiveMobileMenu = false;
    let openMobileMenu = false;
    let openMobileMenuTimeout: ReturnType<typeof setTimeout> | undefined;
    let closeAfterunusedTimeout: ReturnType<typeof setTimeout> | undefined;
    function activeMobileMenu() {
        isActiveMobileMenu = !isActiveMobileMenu;
        if (isActiveMobileMenu) {
            if (openMobileMenuTimeout) clearTimeout(openMobileMenuTimeout);
            openMobileMenuTimeout = setTimeout(() => {
                openMobileMenu = true;
            }, 200);
            if (closeAfterunusedTimeout) clearTimeout(closeAfterunusedTimeout);
            closeAfterunusedTimeout = setTimeout(() => {
                if (openMobileMenuTimeout) clearTimeout(openMobileMenuTimeout);
                isActiveMobileMenu = false;
                openMobileMenu = false;
            }, 30000);
        } else {
            if (openMobileMenuTimeout) clearTimeout(openMobileMenuTimeout);
            openMobileMenu = false;
        }
    }

    let appMenuOpened = false;
    function openAppMenu() {
        emoteMenuSubStore.closeEmoteMenu();
        appMenuOpened = !appMenuOpened;
    }
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClickOutside} on:touchend={onClickOutside} />

<div
    class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0 md:tw-bottom-4"
    class:animated={$bottomActionBarVisibilityStore}
    bind:this={mainHtmlDiv}
>
    <div class="bottom-action-bar tw-absolute screen-blocker">
        {#if $bottomActionBarVisibilityStore}
            <div
                class="bottom-action-section tw-flex animate"
                id="bubble-menu"
                in:fly={{ y: 70, duration: 100, delay: 200 }}
                out:fly={{ y: 70, duration: 100, delay: 0 }}
                class:tw-translate-x-0={$bottomActionBarVisibilityStore}
                class:translate-right={!$bottomActionBarVisibilityStore}
            >
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="tw-transition-all bottom-action-button"
                    class:disabled={$followStateStore !== "off"}
                    on:click={() => analyticsClient.follow()}
                    on:click={followClick}
                >
                    {#if !isMobile}
                        {#if $followStateStore === "active"}
                            <Tooltip text={$LL.actionbar.unfollow()} />
                        {:else}
                            <Tooltip text={$LL.actionbar.follow()} />
                        {/if}
                    {/if}

                    <button class:border-top-light={$followStateStore === "active"}>
                        <img
                            draggable="false"
                            src={followImg}
                            style="padding: 2px"
                            alt={$followStateStore === "active" ? $LL.actionbar.unfollow() : $LL.actionbar.follow()}
                        />
                    </button>
                </div>

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="tw-transition-all bottom-action-button"
                    on:click={() => analyticsClient.layoutPresentChange()}
                    on:click={switchLayoutMode}
                >
                    {#if !isMobile}
                        <Tooltip text={$LL.actionbar.layout()} />
                    {/if}

                    <button>
                        {#if $embedScreenLayoutStore === LayoutMode.Presentation}
                            <img
                                draggable="false"
                                src={layoutChatImg}
                                style="padding: 2px"
                                alt="Switch to presentation mode"
                            />
                        {:else}
                            <img
                                draggable="false"
                                src={layoutPresentationImg}
                                style="padding: 2px"
                                alt="Switch to mosaic mode"
                            />
                        {/if}
                    </button>
                </div>

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="tw-transition-all bottom-action-button"
                    class:disabled={$currentPlayerGroupLockStateStore}
                    on:click={() => analyticsClient.lockDiscussion()}
                    on:click={lockClick}
                >
                    {#if !isMobile}
                        <Tooltip text={$LL.actionbar.lock()} />
                    {/if}

                    <button class:border-top-light={$currentPlayerGroupLockStateStore}>
                        {#if $currentPlayerGroupLockStateStore}
                            <img
                                draggable="false"
                                src={lockCloseImg}
                                style="padding: 2px"
                                alt="Unlock videochat bubble"
                            />
                        {:else}
                            <img draggable="false" src={lockOpenImg} style="padding: 2px" alt="Lock videochat bubble" />
                        {/if}
                    </button>
                </div>

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="tw-transition-all bottom-action-button"
                    on:click={() => analyticsClient.screenSharing()}
                    on:click={screenSharingClick}
                    class:enabled={$requestedScreenSharingState}
                >
                    {#if !isMobile}
                        <Tooltip text={$LL.actionbar.screensharing()} />
                    {/if}

                    <button
                        id="screenSharing"
                        class:border-top-light={$requestedScreenSharingState}
                        disabled={!$screenSharingActivatedStore}
                    >
                        {#if $requestedScreenSharingState && !$silentStore}
                            <img
                                draggable="false"
                                class:disable-opacity={!$screenSharingActivatedStore}
                                src={screenshareOn}
                                style="padding: 2px;"
                                alt="Stop screen sharing"
                            />
                        {:else}
                            <img
                                draggable="false"
                                class:disable-opacity={!$screenSharingActivatedStore}
                                src={screenshareOff}
                                style="padding: 2px;"
                                alt="Start screen sharing"
                            />
                        {/if}
                    </button>
                </div>
            </div>
        {/if}

        <div class="tw-flex tw-flex-row base-section animated tw-flex-wrap tw-justify-center">
            <!-- Discution part -->
            <div class="bottom-action-section tw-flex tw-flex-initial">
                {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore && ![AvailabilityStatus.BUSY, AvailabilityStatus.DO_NOT_DISTURB, AvailabilityStatus.BACK_IN_A_MOMENT].includes($availabilityStatusStore)}
                    {#if $myCameraStore}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class="bottom-action-button tw-relative"
                            on:click={() => analyticsClient.camera()}
                            on:click={cameraClick}
                            class:disabled={!$requestedCameraState || $silentStore}
                        >
                            {#if !isMobile}
                                <Tooltip text={$LL.actionbar.camera()} />
                            {/if}

                            <button
                                class="tooltiptext sm:tw-w-56 md:tw-w-96"
                                class:border-top-light={$requestedCameraState}
                            >
                                {#if $requestedCameraState}
                                    <img
                                        draggable="false"
                                        src={cameraImg}
                                        style="padding: 2px;"
                                        alt="Turn off webcam"
                                    />
                                {:else}
                                    <img
                                        draggable="false"
                                        src={cameraOffImg}
                                        style="padding: 2px;"
                                        alt="Turn on webcam"
                                    />
                                {/if}
                            </button>

                            {#if $requestedCameraState && $cameraListStore && $cameraListStore.length > 1}
                                <button
                                    class="camera tw-absolute tw-text-light-purple focus:outline-none tw-m-0"
                                    on:click|stopPropagation|preventDefault={() => (cameraActive = !cameraActive)}
                                >
                                    {#if cameraActive}
                                        <IconChevronDown font-size="13" />
                                    {:else}
                                        <IconChevronUp font-size="13" />
                                    {/if}
                                </button>

                                <!-- camera list -->
                                <div
                                    class={`wa-dropdown-menu ${cameraActive ? "" : "tw-invisible"}`}
                                    style="bottom: 15px;right: 0;"
                                    on:mouseleave={() => (cameraActive = false)}
                                >
                                    {#each $cameraListStore as camera (camera.deviceId)}
                                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                                        <span
                                            class="wa-dropdown-item tw-flex"
                                            on:click={() => {
                                                analyticsClient.selectCamera();
                                            }}
                                            on:click|stopPropagation|preventDefault={() =>
                                                selectCamera(camera.deviceId)}
                                        >
                                            {StringUtils.normalizeDeviceName(camera.label)}
                                            {#if $usedCameraDeviceIdStore === camera.deviceId}
                                                <IconCheck font-size="13" class="tw-ml-1" />
                                            {/if}
                                        </span>
                                    {/each}
                                </div>
                            {/if}
                        </div>
                    {/if}

                    {#if $myMicrophoneStore}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class="bottom-action-button tw-relative"
                            on:click={() => analyticsClient.microphone()}
                            on:click={microphoneClick}
                            class:disabled={!$requestedMicrophoneState || $silentStore}
                        >
                            {#if !isMobile}
                                <Tooltip text={$LL.actionbar.microphone()} />
                            {/if}

                            <button class:border-top-light={$requestedMicrophoneState}>
                                {#if $requestedMicrophoneState && !$silentStore}
                                    <img
                                        draggable="false"
                                        src={microphoneImg}
                                        style="padding: 2px;"
                                        alt="Turn off microphone"
                                    />
                                {:else}
                                    <img
                                        draggable="false"
                                        src={microphoneOffImg}
                                        style="padding: 2px;"
                                        alt="Turn on microphone"
                                    />
                                {/if}
                            </button>

                            {#if $requestedMicrophoneState && $microphoneListStore && $microphoneListStore.length > 1}
                                <button
                                    class="microphone tw-absolute tw-text-light-purple focus:outline-none tw-m-0"
                                    on:click|stopPropagation|preventDefault={() =>
                                        (microphoneActive = !microphoneActive)}
                                >
                                    {#if microphoneActive}
                                        <IconChevronDown font-size="13" />
                                    {:else}
                                        <IconChevronUp font-size="13" />
                                    {/if}
                                </button>

                                <div
                                    class={`wa-dropdown-menu ${microphoneActive ? "" : "tw-invisible"}`}
                                    style="bottom: 15px;right: 0;"
                                    on:mouseleave={() => (microphoneActive = false)}
                                >
                                    {#if $microphoneListStore.length > 0}
                                        <!-- microphone list -->
                                        <span class="tw-underline tw-font-bold tw-text-xs tw-p-1"
                                            >{$LL.actionbar.subtitle.microphone()} 🎙️</span
                                        >
                                        {#each $microphoneListStore as microphone (microphone.deviceId)}
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
                                                    <IconCheck font-size="13" />
                                                {/if}
                                            </span>
                                        {/each}
                                    {/if}

                                    <!-- speaker list -->
                                    {#if $speakerSelectedStore != undefined && $speakerListStore && $speakerListStore.length > 0}
                                        <span class="tw-underline tw-font-bold tw-text-xs tw-p-1"
                                            >{$LL.actionbar.subtitle.speaker()} 🔈</span
                                        >
                                        {#each $speakerListStore as speaker (speaker.deviceId)}
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
                                                    <IconCheck font-size="13" />
                                                {/if}
                                            </span>
                                        {/each}
                                    {/if}
                                </div>
                            {/if}
                        </div>
                    {/if}
                {/if}

                {#if $isSpeakerStore || $streamingMegaphoneStore || $liveStreamingEnabledStore}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        class="tw-transition-all bottom-action-button"
                        on:click={() => analyticsClient.screenSharing()}
                        on:click={screenSharingClick}
                        class:enabled={$requestedScreenSharingState}
                    >
                        {#if !isMobile}
                            <Tooltip text={$LL.actionbar.screensharing()} />
                        {/if}

                        <button class:border-top-light={$requestedScreenSharingState}>
                            {#if $requestedScreenSharingState}
                                <img
                                    draggable="false"
                                    src={screenshareOn}
                                    style="padding: 2px;"
                                    alt="Stop screen sharing"
                                />
                            {:else}
                                <img
                                    draggable="false"
                                    src={screenshareOff}
                                    style="padding: 2px;"
                                    alt="Start screen sharing"
                                />
                            {/if}
                        </button>
                    </div>
                {/if}

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                {#if $isSpeakerStore && !$streamingMegaphoneStore}
                    <div
                        class="tw-transition-all bottom-action-button"
                        on:click={() => analyticsClient.layoutPresentChange()}
                        on:click={switchLayoutMode}
                    >
                        {#if !isMobile}
                            <Tooltip text={$LL.actionbar.layout()} />
                        {/if}
                        <button>
                            {#if $embedScreenLayoutStore === LayoutMode.Presentation}
                                <img
                                    draggable="false"
                                    src={layoutChatImg}
                                    style="padding: 2px"
                                    alt="Switch to presentation mode"
                                />
                            {:else}
                                <img
                                    draggable="false"
                                    src={layoutPresentationImg}
                                    style="padding: 2px"
                                    alt="Switch to mosaic mode"
                                />
                            {/if}
                        </button>
                    </div>
                {/if}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    on:click={() => analyticsClient.openedChat()}
                    on:click={toggleChat}
                    class="bottom-action-button tw-relative"
                >
                    {#if !isMobile}
                        <Tooltip text={$LL.actionbar.chat()} />
                    {/if}

                    <button class:border-top-light={$chatVisibilityStore} class="chat-btn">
                        <img draggable="false" src={bubbleImg} style="padding: 2px" alt="Toggle chat" />
                    </button>
                    {#if $chatZoneLiveStore || $peerStore.size > 0 || $chatHasUnreadMessage || $proximityChatRoomHasUnreadMessage}
                        <div class="tw-absolute tw-top-1 tw-right-0.5">
                            <span
                                class={`tw-w-4 tw-h-4 ${
                                    $peerStore.size > 0 ? "tw-bg-pop-green" : "tw-bg-pop-red"
                                } tw-block tw-rounded-full tw-absolute tw-top-0 tw-right-0 tw-animate-ping`}
                            />
                            <span
                                class={`tw-w-3 tw-h-3 ${
                                    $peerStore.size > 0 ? "tw-bg-pop-green" : "tw-bg-pop-red"
                                } tw-block tw-rounded-full tw-absolute tw-top-0.5 tw-right-0.5`}
                            />
                        </div>
                    {:else if $totalMessagesToSee > 0}
                        <span
                            class="tw-absolute tw-top-1.5 tw-right-1 tw-items-center tw-justify-center tw-px-1 tw-py-0.5 tw-text-xxs tw-font-bold tw-leading-none tw-text-white tw-bg-pop-red tw-rounded-full"
                        >
                            {$totalMessagesToSee}
                        </span>
                    {/if}
                </div>
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div on:click|stopPropagation={toggleEmojiPicker} class="bottom-action-button">
                    {#if !isMobile}
                        <Tooltip text={$LL.actionbar.emoji()} />
                    {/if}

                    <button class:border-top-light={$emoteMenuSubStore}>
                        <img draggable="false" src={emojiPickOn} style="padding: 2px" alt="Toggle emoji picker" />
                    </button>
                </div>
                {#if $megaphoneCanBeUsedStore && !$silentStore && ($myMicrophoneStore || $myCameraStore)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div on:click={toggleGlobalMessage} class="bottom-action-button tw-relative">
                        {#if !isMobile}
                            {#if $liveStreamingEnabledStore}
                                <Tooltip text={$LL.actionbar.disableMegaphone()} />
                            {:else}
                                <Tooltip text={$LL.actionbar.globalMessage()} />
                            {/if}
                        {/if}

                        <button
                            class:border-top-warning={$liveStreamingEnabledStore}
                            class:border-top-light={$showModalGlobalComminucationVisibilityStore}
                            id="megaphone"
                        >
                            <img draggable="false" src={megaphoneImg} style="padding: 2px" alt="Toggle megaphone" />
                        </button>
                        {#if $liveStreamingEnabledStore}
                            <div class="tw-absolute tw-top-[1.05rem] tw-right-1">
                                <span
                                    class="tw-w-3 tw-h-3 tw-bg-warning tw-block tw-rounded-full tw-absolute tw-top-0 tw-right-0 tw-animate-ping tw-cursor-pointer"
                                />
                                <span
                                    class="tw-w-2 tw-h-2 tw-bg-warning tw-block tw-rounded-full tw-absolute tw-top-0.5 tw-right-0.5 tw-cursor-pointer"
                                />
                            </div>
                        {/if}
                    </div>
                {/if}
            </div>

            {#if !isMobile || openMobileMenu == true}
                <!-- Menu part -->
                <div class="bottom-action-section tw-flex tw-flex-initial">
                    <!-- Logo part -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={() => analyticsClient.openedMenu()}
                        on:click={showMenu}
                        class="bottom-action-button"
                    >
                        {#if !isMobile}
                            <Tooltip text={$LL.actionbar.menu()} />
                        {/if}

                        <button id="menuIcon" class:border-top-light={$menuVisiblilityStore}>
                            <img draggable="false" src={menuImg} style="padding: 2px" alt={$LL.menu.icon.open.menu()} />
                        </button>
                    </div>

                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={() => analyticsClient.openedMenu()}
                        on:click|stopPropagation={openAppMenu}
                        class="bottom-action-button"
                    >
                        {#if !isMobile}
                            <Tooltip text={$LL.actionbar.appList()} />
                        {/if}

                        <button id="appIcon" class:border-top-light={appMenuOpened}>
                            <img draggable="false" src={AppSvg} style="padding: 2px" alt="Applications list" />
                        </button>
                    </div>
                </div>

                <!-- Status part -->
                <div class="bottom-action-section tw-flex tw-flex-initial">
                    <AvailabilityStatusComponent />
                </div>

                <!-- Editor part -->
                <div class="bottom-action-section tw-flex tw-flex-initial">
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={toggleMapEditorMode}
                        class="bottom-action-button"
                    >
                        {#if isMobile}
                            <Tooltip text={$LL.actionbar.mapEditorMobileLocked()} />
                        {:else if !$mapManagerActivated}
                            <Tooltip text={$LL.actionbar.mapEditorLocked()} />
                        {:else}
                            <Tooltip text={$LL.actionbar.mapEditor()} />
                        {/if}
                        <button
                            id="mapEditorIcon"
                            class:border-top-light={$mapEditorModeStore && !isMobile}
                            name="toggle-map-editor"
                            disabled={isMobile || !$mapManagerActivated}
                        >
                            <img
                                draggable="false"
                                src={mapBuilder}
                                class:disable-opacity={isMobile || !$mapManagerActivated}
                                style="padding: 2px"
                                alt="toggle-map-editor"
                            />
                        </button>
                    </div>
                    {#if $userHasAccessToBackOfficeStore}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            on:dragstart|preventDefault={noDrag}
                            on:click={() => analyticsClient.openBackOffice()}
                            on:click={openBo}
                            class="bottom-action-button"
                        >
                            {#if !isMobile}
                                <Tooltip text={$LL.actionbar.bo()} />
                            {/if}

                            <button
                                id="backOfficeIcon"
                                name="toggle-back-office"
                                disabled={isMobile || !$mapManagerActivated}
                            >
                                <img
                                    draggable="false"
                                    src={backOfficeImg}
                                    class:disable-opacity={isMobile}
                                    style="padding: 2px"
                                    alt={$LL.actionbar.bo()}
                                />
                            </button>
                        </div>
                    {/if}
                </div>
            {/if}

            {#if $addActionButtonActionBarEvent.length > 0}
                <div class="bottom-action-section tw-flex tw-flex-initial">
                    {#each $addActionButtonActionBarEvent as button (button.id)}
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
                            class="bottom-action-button"
                        >
                            {#if button.toolTip && !isMobile}
                                <Tooltip text={button.toolTip} />
                            {/if}
                            <button id={button.id}>
                                <img
                                    draggable="false"
                                    src={button.imageSrc}
                                    style="padding: 2px"
                                    alt={button.toolTip}
                                />
                            </button>
                        </div>
                    {/each}
                </div>
            {/if}

            {#if $inviteUserActivated}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="bottom-action-section tw-flex tw-flex-initial"
                    in:fly={{}}
                    on:dragstart|preventDefault={noDrag}
                    on:click={() => analyticsClient.openInvite()}
                    on:click={showInvite}
                >
                    <button
                        class="btn light tw-m-0 tw-font-bold tw-text-xs sm:tw-text-base"
                        id="invite-btn"
                        class:border-top-light={$menuVisiblilityStore}
                    >
                        {$LL.menu.sub.invite()}
                    </button>
                </div>
            {/if}
            {#each $addClassicButtonActionBarEvent as button (button.id)}
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="bottom-action-section tw-flex tw-flex-initial"
                    in:fly={{}}
                    on:dragstart|preventDefault={noDrag}
                    on:click={() => analyticsClient.clickOnCustomButton(button.id, button.label)}
                    on:click={() => {
                        buttonActionBarTrigger(button.id);
                    }}
                >
                    <button class="btn light tw-m-0 tw-font-bold tw-text-xs sm:tw-text-base" id={button.id}>
                        {button.label}
                    </button>
                </div>
            {/each}

            {#if isMobile}
                <!-- Menu mobile part -->
                <div class="bottom-action-section tw-flex tw-flex-initial">
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={() => activeMobileMenu()}
                        class="bottom-action-button"
                    >
                        <button id="burgerIcon">
                            <img
                                draggable="false"
                                src={burgerMenuImg}
                                style="padding: 2px"
                                alt={$LL.menu.icon.open.mobile()}
                                class="tw-transition-all tw-transform"
                                class:tw-rotate-0={isActiveMobileMenu == false}
                                class:tw-rotate-90={isActiveMobileMenu == true}
                            />
                        </button>
                    </div>
                </div>
            {/if}
        </div>
    </div>
</div>

{#if $emoteMenuSubStore}
    <div
        class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0"
        style="margin-bottom: 5.5rem; height: auto;"
    >
        <div class="bottom-action-bar">
            <div class="bottom-action-section tw-flex animate">
                {#each [...$emoteDataStore.keys()] as key (key)}
                    <div class="tw-transition-all bottom-action-button">
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
                                <span class="tw-text-white">{key}</span>
                            {/if}
                        </button>
                    </div>
                {/each}

                <div class="tw-transition-all bottom-action-button">
                    <button on:click={() => analyticsClient.editEmote()} on:click|preventDefault={edit}>
                        {#if $emoteDataStoreLoading}
                            <div class="tw-rounded-lg tw-bg-dark tw-text-xs">
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
                                style="padding: 6px"
                                alt={$LL.menu.icon.open.openEmoji()}
                            />
                        {/if}
                    </button>
                </div>
                <div class="tw-transition-all bottom-action-button">
                    <button on:click|preventDefault={close}>
                        <img
                            draggable="false"
                            src={closeImg}
                            style="padding: 8px"
                            alt={$LL.menu.icon.open.closeEmoji()}
                        />
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

{#if appMenuOpened && ($roomListActivated || $isCalendarActivatedStore || $isTodoListActivatedStore || $externalActionBarSvelteComponent.size > 0)}
    <div
        class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0"
        style="margin-bottom: 5.5rem; height: auto;"
    >
        <div class="bottom-action-bar">
            <div class="bottom-action-section tw-flex animate">
                <!-- Room list part -->
                {#if $roomListActivated}
                    <!-- TODO button hep -->
                    <!-- Room list button -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={() => analyticsClient.openedRoomList()}
                        on:click={showRoomList}
                        class="bottom-action-button"
                    >
                        {#if !isMobile}
                            <Tooltip text={$LL.actionbar.roomList()} />
                        {/if}

                        <button id="roomListIcon" class:border-top-light={$roomListVisibilityStore}>
                            <!-- svelte-ignore a11y-img-redundant-alt -->
                            <img
                                draggable="false"
                                src={worldImg}
                                style="padding: 2px"
                                alt="Image for room list modal"
                            />
                        </button>
                    </div>
                {/if}

                <!-- Calendar integration -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    on:dragstart|preventDefault={noDrag}
                    on:click={() => analyticsClient.openExternalModuleCalendar()}
                    on:click={openExternalModuleCalendar}
                    class="bottom-action-button"
                >
                    {#if !isMobile}
                        <Tooltip
                            text={$isCalendarActivatedStore
                                ? $LL.actionbar.calendar()
                                : $LL.actionbar.featureNotAvailable()}
                        />
                    {/if}
                    <button
                        id="calendarIcon"
                        class:border-top-light={$isCalendarVisibleStore}
                        class:!tw-cursor-not-allowed={!$isCalendarActivatedStore}
                        class:!no-pointer-events={!$isCalendarActivatedStore}
                        disabled={!$isCalendarActivatedStore}
                    >
                        <img
                            draggable="false"
                            src={calendarSvg}
                            style="padding: 2px"
                            alt={$LL.menu.icon.open.calendar()}
                            class:disable-opacity={!$isCalendarActivatedStore}
                            class:!tw-cursor-not-allowed={!$isCalendarActivatedStore}
                        />
                    </button>
                </div>

                <!-- Todo List Integration -->
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    on:dragstart|preventDefault={noDrag}
                    on:click={() => analyticsClient.openExternalModuleTodoList()}
                    on:click={openExternalModuleTodoList}
                    class="bottom-action-button"
                >
                    {#if !isMobile}
                        <Tooltip
                            text={$isTodoListActivatedStore
                                ? $LL.actionbar.todoList()
                                : $LL.actionbar.featureNotAvailable()}
                        />
                    {/if}
                    <button
                        id="todoListIcon"
                        class:border-top-light={$isTodoListVisibleStore}
                        class:!tw-cursor-not-allowed={!$isTodoListActivatedStore}
                        class:!no-pointer-events={!$isTodoListActivatedStore}
                        disabled={!$isTodoListActivatedStore}
                    >
                        <img
                            draggable="false"
                            src={todoListSvg}
                            style="padding: 2px"
                            alt={$LL.menu.icon.open.todoList()}
                            class:disable-opacity={!$isTodoListActivatedStore}
                            class:!tw-cursor-not-allowed={!$isTodoListActivatedStore}
                        />
                    </button>
                </div>
            </div>

            <div class="bottom-action-section tw-flex animate">
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

            <div class="bottom-action-section tw-flex animate">
                <div class="tw-transition-all bottom-action-button">
                    <button on:click|preventDefault={openAppMenu}>
                        <img draggable="false" src={closeImg} style="padding: 8px" alt={$LL.actionbar.appList()} />
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    @import "../../style/breakpoints.scss";
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

    .bottom-action-section {
        .bottom-action-button {
            button.camera,
            button.microphone {
                top: 0;
                width: 20px;
                height: 20px;
                background: none;
                right: 0;
                border-top-left-radius: 0.25rem;
                border-bottom-left-radius: 0.25rem;
                border-top-right-radius: 0.25rem;
                border-bottom-right-radius: 0.25rem;
                color: white;
                padding: 0;
                margin: 0;
                display: block;
                &:hover {
                    background-color: rgb(56 56 74);
                }
            }
        }
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
