<script lang="ts">
    import { requestedScreenSharingState } from "../Stores/ScreenSharingStore";
    import { requestedCameraState, requestedMicrophoneState, silentStore } from "../Stores/MediaStore";
    import cameraImg from "./images/camera.png";
    import cameraOffImg from "./images/camera-off.png";
    import microphoneImg from "./images/microphone.png";
    import microphoneOffImg from "./images/microphone-off.png";
    import layoutPresentationImg from "./images/layout-presentation.png";
    import layoutChatImg from "./images/layout-chat.png";
    import bubbleImg from "./images/bubble-talk.png";
    import followImg from "./images/follow.png";
    import lockOpenImg from "./images/lock-opened.png";
    import lockCloseImg from "./images/lock-closed.png";
    import screenshareOn from "./images/screenshare-on.png";
    import screenshareOff from "./images/screenshare-off.png";
    import emojiPickOn from "./images/emoji-on.png";
    import closeImg from "./images/close.png";
    import penImg from "./images/pen.png";
    import WorkAdventureImg from "./images/icon-workadventure-white.png";
    import { LayoutMode } from "../WebRtc/LayoutManager";
    import { embedScreenLayoutStore } from "../Stores/EmbedScreensStore";
    import { followRoleStore, followStateStore, followUsersStore } from "../Stores/FollowStore";
    import { gameManager } from "../Phaser/Game/GameManager";
    import { currentPlayerGroupLockStateStore } from "../Stores/CurrentPlayerGroupStore";
    import { analyticsClient } from "../Administration/AnalyticsClient";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import {
        activeSubMenuStore,
        menuVisiblilityStore,
        inviteUserActivated,
        SubMenusInterface,
        subMenusStore,
        MenuItem,
        TranslatedMenu,
    } from "../Stores/MenuStore";
    import {
        Emoji,
        emoteDataStore,
        emoteMenuStore,
        emoteMenuSubCurrentEmojiSelectedStore,
        emoteMenuSubStore,
        emoteStore,
    } from "../Stores/EmoteStore";
    import LL from "../i18n/i18n-svelte";
    import { bottomActionBarVisibilityStore } from "../Stores/BottomActionBarStore";
    import { fly } from "svelte/transition";
    import { ADMIN_URL } from "../Enum/EnvironmentVariable";
    import { limitMapStore } from "../Stores/GameStore";
    import { isMediaBreakpointUp } from "../Utils/BreakpointsUtils";

    const gameScene = gameManager.getCurrentGameScene();
    let menuImg = gameManager.currentStartedRoom?.miniLogo ?? WorkAdventureImg;

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
                gameScene.connection?.emitFollowRequest();
                followRoleStore.set("leader");
                followStateStore.set("active");
                break;
            case "requesting":
            case "active":
            case "ending":
                gameScene.connection?.emitFollowAbort();
                followUsersStore.stopFollowing();
                break;
        }
    }

    function lockClick() {
        gameScene.connection?.emitLockGroup(!$currentPlayerGroupLockStateStore);
    }

    function toggleChat() {
        chatVisibilityStore.set(!$chatVisibilityStore);
    }

    function toggleEmojiPicker() {
        $emoteMenuSubStore == true ? emoteMenuSubStore.closeEmoteMenu() : emoteMenuSubStore.openEmoteMenu();
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
        const indexInviteMenu = $subMenusStore.findIndex(
            (menu: MenuItem) => (menu as TranslatedMenu).key === SubMenusInterface.invite
        );
        if (indexInviteMenu === -1) {
            console.error(`Menu key: ${SubMenusInterface.invite} was not founded in subMenusStore: `, $subMenusStore);
            return;
        }
        if ($menuVisiblilityStore && $activeSubMenuStore === indexInviteMenu) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.set(0);
            return;
        }
        activeSubMenuStore.set(indexInviteMenu);
        menuVisiblilityStore.set(true);
    }

    function showMenu() {
        const indexInviteMenu = $subMenusStore.findIndex(
            (menu: MenuItem) => (menu as TranslatedMenu).key === SubMenusInterface.profile
        );
        if (indexInviteMenu === -1) {
            console.error(`Menu key: ${SubMenusInterface.profile} was not founded in subMenusStore: `, $subMenusStore);
            return;
        }
        if ($menuVisiblilityStore && $activeSubMenuStore === indexInviteMenu) {
            menuVisiblilityStore.set(false);
            activeSubMenuStore.set(0);
            return;
        }
        activeSubMenuStore.set(indexInviteMenu);
        menuVisiblilityStore.set(true);
    }

    function register() {
        window.open(`${ADMIN_URL}/second-step-register`, "_self");
    }

    function noDrag() {
        return false;
    }

    const isMobile = isMediaBreakpointUp("md");
</script>

<svelte:window on:keydown={onKeyDown} />

<div
    class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0"
    style="margin-bottom: 10px"
    class:animated={$bottomActionBarVisibilityStore}
>
    <div class="bottom-action-bar" class:move-menu={$bottomActionBarVisibilityStore}>
        {#if $bottomActionBarVisibilityStore}
            <div
                class="bottom-action-section tw-flex animate"
                id="bubble-menu"
                in:fly={{ y: 70, duration: 100, delay: 500 }}
                out:fly={{ y: 70, duration: 100, delay: 0 }}
                class:tw-translate-x-0={$bottomActionBarVisibilityStore}
                class:translate-right={!$bottomActionBarVisibilityStore}
            >
                <div
                    class="tw-transition-all bottom-action-button"
                    class:disabled={$followStateStore !== "off"}
                    on:click={() => analyticsClient.follow()}
                    on:click={followClick}
                >
                    <button class:border-top-light={$followStateStore === "active"}>
                        <img src={followImg} style="padding: 2px" alt="Toggle follow" />
                    </button>
                </div>

                <div
                    class="tw-transition-all bottom-action-button"
                    on:click={() => analyticsClient.layoutPresentChange()}
                    on:click={switchLayoutMode}
                >
                    <button>
                        {#if $embedScreenLayoutStore === LayoutMode.Presentation}
                            <img src={layoutPresentationImg} style="padding: 2px" alt="Switch to mosaic mode" />
                        {:else}
                            <img src={layoutChatImg} style="padding: 2px" alt="Switch to presentation mode" />
                        {/if}
                    </button>
                </div>

                <div
                    class="tw-transition-all bottom-action-button"
                    class:disabled={$currentPlayerGroupLockStateStore}
                    on:click={() => analyticsClient.lockDiscussion()}
                    on:click={lockClick}
                >
                    <button class=" " class:border-top-light={$currentPlayerGroupLockStateStore}>
                        {#if $currentPlayerGroupLockStateStore}
                            <img src={lockCloseImg} style="padding: 2px" alt="Unlock videochat bubble" />
                        {:else}
                            <img src={lockOpenImg} style="padding: 2px" alt="Lock videochat bubble" />
                        {/if}
                    </button>
                </div>

                <div
                    class="tw-transition-all bottom-action-button"
                    on:click={() => analyticsClient.screenSharing()}
                    on:click={screenSharingClick}
                    class:enabled={$requestedScreenSharingState}
                >
                    <button class:border-top-light={$requestedScreenSharingState}>
                        {#if $requestedScreenSharingState && !$silentStore}
                            <img src={screenshareOn} style="padding: 2px;" alt="Stop screen sharing" />
                        {:else}
                            <img src={screenshareOff} style="padding: 2px;" alt="Start screen sharing" />
                        {/if}
                    </button>
                </div>
            </div>
        {/if}

        <div class="tw-flex tw-flex-row base-section animated">
            <div class="bottom-action-section tw-flex tw-flex-initial">
                <div
                    class="bottom-action-button"
                    on:click={() => analyticsClient.camera()}
                    on:click={cameraClick}
                    class:disabled={!$requestedCameraState || $silentStore}
                >
                    <button class:border-top-light={$requestedCameraState}>
                        {#if $requestedCameraState && !$silentStore}
                            <img src={cameraImg} style="padding: 2px;" alt="Turn off webcam" />
                        {:else}
                            <img src={cameraOffImg} style="padding: 2px;" alt="Turn on webcam" />
                        {/if}
                    </button>
                </div>

                <div
                    class="bottom-action-button"
                    on:click={() => analyticsClient.microphone()}
                    on:click={microphoneClick}
                    class:disabled={!$requestedMicrophoneState || $silentStore}
                >
                    <button class:border-top-light={$requestedMicrophoneState}>
                        {#if $requestedMicrophoneState && !$silentStore}
                            <img src={microphoneImg} style="padding: 2px;" alt="Turn off microphone" />
                        {:else}
                            <img src={microphoneOffImg} style="padding: 2px;" alt="Turn on microphone" />
                        {/if}
                    </button>
                </div>

                <div on:click={() => analyticsClient.openedChat()} on:click={toggleChat} class="bottom-action-button">
                    <button class:border-top-light={$chatVisibilityStore}>
                        <img src={bubbleImg} style="padding: 2px" alt="Toggle chat" />
                    </button>
                </div>

                <div on:click={toggleEmojiPicker} class="bottom-action-button">
                    <button class:border-top-light={$emoteMenuSubStore}>
                        <img src={emojiPickOn} style="padding: 2px" alt="Toggle emoji picker" />
                    </button>
                </div>
            </div>

            <div class="bottom-action-section tw-flex tw-flex-initial">
                <div
                    on:dragstart|preventDefault={noDrag}
                    on:click={() => analyticsClient.openedMenu()}
                    on:click={showMenu}
                    class="bottom-action-button"
                >
                    <button id="menuIcon" class:border-top-light={$menuVisiblilityStore}>
                        <img src={menuImg} style="padding: 2px" alt={$LL.menu.icon.open.menu()} />
                    </button>
                </div>
            </div>

            {#if $limitMapStore}
                <div
                    class="bottom-action-section tw-flex tw-flex-initial"
                    in:fly={{}}
                    on:dragstart|preventDefault={noDrag}
                    on:click={() => analyticsClient.openRegister()}
                    on:click={register}
                >
                    <button
                        class="btn light tw-m-0 tw-font-bold tw-text-xs sm:tw-text-base"
                        id="register-btn"
                        class:border-top-light={$menuVisiblilityStore}
                    >
                        {$LL.menu.icon.open.register()}
                    </button>
                </div>
            {/if}

            {#if $inviteUserActivated}
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
        </div>
    </div>
</div>

{#if $emoteMenuSubStore}
    <div
        class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0"
        style="margin-bottom: 64px;"
    >
        <div class="bottom-action-bar">
            <div class="bottom-action-section tw-flex animate">
                {#each [...$emoteDataStore.keys()] as key}
                    <div class="tw-transition-all bottom-action-button">
                        <button
                            on:click={() => {
                                clickEmoji(key);
                            }}
                            id={`button-${$emoteDataStore.get(key)?.name}`}
                            class="emoji"
                            class:focus={$emoteMenuStore && $emoteMenuSubCurrentEmojiSelectedStore === key}
                        >
                            <img
                                class="emoji"
                                style="padding: 2px"
                                draggable="false"
                                alt={$emoteDataStore.get(key)?.unicode}
                                id={`icon-${$emoteDataStore.get(key)?.name}`}
                                src={$emoteDataStore.get(key)?.url}
                            />
                            {#if !isMobile}
                                <span class="tw-text-white">{key}</span>
                            {/if}
                        </button>
                    </div>
                {/each}

                <div class="tw-transition-all bottom-action-button">
                    <button on:click={() => analyticsClient.editEmote()} on:click|preventDefault={edit}>
                        <img src={penImg} style="padding: 2px" alt={$LL.menu.icon.open.openEmoji()} />
                    </button>
                </div>
                <div class="tw-transition-all bottom-action-button">
                    <button on:click|preventDefault={close}>
                        <img src={closeImg} style="padding: 4px" alt={$LL.menu.icon.open.closeEmoji()} />
                    </button>
                </div>
            </div>
        </div>
    </div>
{/if}

<style lang="scss">
    .animated {
        transition-property: transform;
        transition-duration: 0.5s;
    }

    .translate-right {
        transform: translateX(2rem);
    }

    @media only screen and (max-width: 640px) {
        //is equal to tailwind's sm breakpoint
        .translate-right {
            transform: translateX(0);
        }

        .move-menu {
            transform: translate(-3rem, -2rem);
        }
    }
</style>
