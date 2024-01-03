<script lang="ts">
    import type { Unsubscriber } from "svelte/store";
    import { ChevronDownIcon, ChevronUpIcon, CheckIcon } from "svelte-feather-icons";
    import { fly } from "svelte/transition";
    import { onDestroy, onMount } from "svelte";
    import { writable } from "svelte/store";
    import { Subscription } from "rxjs";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import {
        cameraListStore,
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
        liveStreamingEnabledStore,
        requestedMegaphoneStore,
    } from "../../Stores/MegaphoneStore";
    import { layoutManagerActionStore } from "../../Stores/LayoutManagerStore";
    import { localUserStore } from "../../Connection/LocalUserStore";
    import { ADMIN_URL } from "../../Enum/EnvironmentVariable";
    import MegaphoneConfirm from "./MegaphoneConfirm.svelte";

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
        }
    }

    function toggleMegaphone() {
        if ($streamingMegaphoneStore) {
            streamingMegaphoneStore.set(false);
            return;
        }
        if ($requestedMegaphoneStore || $liveStreamingEnabledStore) {
            analyticsClient.stopMegaphone();
            requestedMegaphoneStore.set(false);
            return;
        }

        analyticsClient.startMegaphone();
        streamingMegaphoneStore.set(true);
    }

    function toggleMapEditorMode() {
        if (isMobile) return;
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
    let chatTotalMessagesSubscription: Subscription | undefined;
    let totalMessagesToSee = writable<number>(0);
    onMount(() => {
        chatTotalMessagesSubscription = iframeListener.chatTotalMessagesToSeeStream.subscribe((total) =>
            totalMessagesToSee.set(total)
        );
        resizeObserver.observe(mainHtmlDiv);
    });

    onDestroy(() => {
        subscribers.map((subscriber) => subscriber());
        chatTotalMessagesSubscription?.unsubscribe();
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
</script>

<svelte:window on:keydown={onKeyDown} />

<div
    class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0"
    class:animated={$bottomActionBarVisibilityStore}
    bind:this={mainHtmlDiv}
>
    <div class="bottom-action-bar tw-absolute">
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
                    <Tooltip text={$LL.actionbar.follow()} />

                    <button class:border-top-light={$followStateStore === "active"}>
                        <img draggable="false" src={followImg} style="padding: 2px" alt="Toggle follow" />
                    </button>
                </div>

                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    class="tw-transition-all bottom-action-button"
                    on:click={() => analyticsClient.layoutPresentChange()}
                    on:click={switchLayoutMode}
                >
                    <Tooltip text={$LL.actionbar.layout()} />

                    <button>
                        {#if $embedScreenLayoutStore === LayoutMode.Presentation}
                            <img
                                draggable="false"
                                src={layoutPresentationImg}
                                style="padding: 2px"
                                alt="Switch to mosaic mode"
                            />
                        {:else}
                            <img
                                draggable="false"
                                src={layoutChatImg}
                                style="padding: 2px"
                                alt="Switch to presentation mode"
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
                    <Tooltip text={$LL.actionbar.lock()} />

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
                    <Tooltip text={$LL.actionbar.screensharing()} />

                    <button class:border-top-light={$requestedScreenSharingState}>
                        {#if $requestedScreenSharingState && !$silentStore}
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
            </div>
        {/if}

        <div class="tw-flex tw-flex-row base-section animated tw-flex-wrap tw-justify-center">
            <div class="bottom-action-section tw-flex tw-flex-initial">
                {#if !$inExternalServiceStore && !$silentStore && $proximityMeetingStore}
                    {#if $myCameraStore}
                        <!-- svelte-ignore a11y-click-events-have-key-events -->
                        <div
                            class="bottom-action-button tw-relative"
                            on:click={() => analyticsClient.camera()}
                            on:click={cameraClick}
                            class:disabled={!$requestedCameraState || $silentStore}
                        >
                            <Tooltip text={$LL.actionbar.camera()} />

                            <button
                                class="tooltiptext sm:tw-w-56 md:tw-w-96"
                                class:border-top-light={$requestedCameraState}
                            >
                                {#if $requestedCameraState && !$silentStore}
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
                                        <ChevronDownIcon size="13" />
                                    {:else}
                                        <ChevronUpIcon size="13" />
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
                                                <CheckIcon size="13" class="tw-ml-1" />
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
                            <Tooltip text={$LL.actionbar.microphone()} />

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
                                        <ChevronDownIcon size="13" />
                                    {:else}
                                        <ChevronUpIcon size="13" />
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
                                                    <CheckIcon size="13" />
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
                                                    <CheckIcon size="13" />
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
                    <div
                        class="tw-transition-all bottom-action-button"
                        on:click={() => analyticsClient.screenSharing()}
                        on:click={screenSharingClick}
                        class:enabled={$requestedScreenSharingState}
                    >
                        <Tooltip text={$LL.actionbar.screensharing()} />

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
                <div
                    on:click={() => analyticsClient.openedChat()}
                    on:click={toggleChat}
                    class="bottom-action-button tw-relative"
                >
                    <Tooltip text={$LL.actionbar.chat()} />

                    <button class:border-top-light={$chatVisibilityStore} class="chat-btn">
                        <img draggable="false" src={bubbleImg} style="padding: 2px" alt="Toggle chat" />
                    </button>
                    {#if $chatZoneLiveStore || $peerStore.size > 0}
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
                <div on:click={toggleEmojiPicker} class="bottom-action-button">
                    <Tooltip text={$LL.actionbar.emoji()} />

                    <button class:border-top-light={$emoteMenuSubStore}>
                        <img draggable="false" src={emojiPickOn} style="padding: 2px" alt="Toggle emoji picker" />
                    </button>
                </div>
                {#if $megaphoneCanBeUsedStore && !$silentStore && ($myMicrophoneStore || $myCameraStore)}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div on:click={toggleMegaphone} class="bottom-action-button tw-relative">
                        {#if $streamingMegaphoneStore}
                            <MegaphoneConfirm />
                        {:else}
                            <Tooltip
                                text={$liveStreamingEnabledStore
                                    ? $LL.actionbar.disableMegaphone()
                                    : $LL.actionbar.enableMegaphone()}
                            />
                        {/if}

                        <button
                            class:border-top-warning={$liveStreamingEnabledStore || $streamingMegaphoneStore}
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

            <div class="bottom-action-section tw-flex tw-flex-initial">
                <!-- svelte-ignore a11y-click-events-have-key-events -->
                <div
                    on:dragstart|preventDefault={noDrag}
                    on:click={() => analyticsClient.openedMenu()}
                    on:click={showMenu}
                    class="bottom-action-button"
                >
                    <Tooltip text={$LL.actionbar.menu()} />

                    <button id="menuIcon" class:border-top-light={$menuVisiblilityStore}>
                        <img draggable="false" src={menuImg} style="padding: 2px" alt={$LL.menu.icon.open.menu()} />
                    </button>
                </div>
                {#if $mapEditorActivated}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={toggleMapEditorMode}
                        class="bottom-action-button"
                    >
                        {#if isMobile}
                            <Tooltip text={$LL.actionbar.mapEditorMobileLocked()} />
                        {:else}
                            <Tooltip text={$LL.actionbar.mapEditor()} />
                        {/if}
                        <button
                            id="mapEditorIcon"
                            class:border-top-light={$mapEditorModeStore && !isMobile}
                            name="toggle-map-editor"
                            disabled={isMobile}
                        >
                            <img
                                draggable="false"
                                src={mapBuilder}
                                class:disable-opacity={isMobile}
                                style="padding: 2px"
                                alt="toggle-map-editor"
                            />
                        </button>
                    </div>
                {/if}
                {#if $userHasAccessToBackOfficeStore}
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <div
                        on:dragstart|preventDefault={noDrag}
                        on:click={() => analyticsClient.openBackOffice()}
                        on:click={openBo}
                        class="bottom-action-button"
                    >
                        <Tooltip text={$LL.actionbar.bo()} />

                        <button id="backOfficeIcon">
                            <img draggable="false" src={hammerImg} style="padding: 2px" alt="toggle-bo" />
                        </button>
                    </div>
                {/if}
            </div>

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
                            {#if button.toolTip}
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
        </div>
    </div>
</div>

{#if $emoteMenuSubStore}
    <div
        class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0"
        style="margin-bottom: 4.5rem; height: auto;"
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
                                style="padding: 2px"
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
