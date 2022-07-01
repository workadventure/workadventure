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
    import { LayoutMode } from "../WebRtc/LayoutManager";
    import { embedScreenLayoutStore } from "../Stores/EmbedScreensStore";
    import { followRoleStore, followStateStore, followUsersStore } from "../Stores/FollowStore";
    import { gameManager } from "../Phaser/Game/GameManager";
    import { currentPlayerGroupLockStateStore } from "../Stores/CurrentPlayerGroupStore";
    import { analyticsClient } from "../Administration/AnalyticsClient";
    import { chatVisibilityStore } from "../Stores/ChatStore";
    import { activeSubMenuStore, menuVisiblilityStore } from "../Stores/MenuStore";
    import { emoteMenuStore } from "../Stores/EmoteStore";
    import LL from "../i18n/i18n-svelte";
    import { bottomActionBarVisibilityStore } from "../Stores/BottomActionBarStore";
    import { fly } from "svelte/transition";

    const gameScene = gameManager.getCurrentGameScene();

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

    function toggleInviteMenu() {
        activeSubMenuStore.set(2);
        menuVisiblilityStore.set(!$menuVisiblilityStore);
    }

    function toggleEmojiPicker() {
        $emoteMenuStore == true ? emoteMenuStore.closeEmoteMenu() : emoteMenuStore.openEmoteMenu();
    }
</script>

<div
    class="tw-flex tw-justify-center tw-m-auto tw-absolute tw-left-0 tw-right-0 tw-bottom-0"
    class:animated={$bottomActionBarVisibilityStore}
>
    <div class="bottom-action-bar tw-max-h-10" class:move-menu={$bottomActionBarVisibilityStore}>
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

                <div class="tw-transition-all bottom-action-button" on:click={switchLayoutMode}>
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
                            <img src={screenshareOn} alt="Stop screen sharing" />
                        {:else}
                            <img src={screenshareOff} alt="Start screen sharing" />
                        {/if}
                    </button>
                </div>
            </div>
        {/if}

        <div
            class="tw-flex tw-flex-row base-section animated"
            class:translate-left={!$bottomActionBarVisibilityStore}
            class:tw-translate-x-0={$bottomActionBarVisibilityStore}
        >
            <div class="bottom-action-section tw-flex tw-flex-initial">
                <div
                    class="bottom-action-button"
                    on:click={() => analyticsClient.camera()}
                    on:click={cameraClick}
                    class:disabled={!$requestedCameraState || $silentStore}
                >
                    <button class:border-top-light={$requestedCameraState}>
                        {#if $requestedCameraState && !$silentStore}
                            <img src={cameraImg} alt="Turn off webcam" />
                        {:else}
                            <img src={cameraOffImg} alt="Turn on webcam" />
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
                            <img src={microphoneImg} alt="Turn off microphone" />
                        {:else}
                            <img src={microphoneOffImg} alt="Turn on microphone" />
                        {/if}
                    </button>
                </div>

                <div on:click={() => analyticsClient.openedChat()} on:click={toggleChat} class="bottom-action-button">
                    <button class:border-top-light={$chatVisibilityStore}>
                        <img src={bubbleImg} style="padding: 2px" alt="Toggle chat" />
                    </button>
                </div>
                <div on:click={toggleEmojiPicker} class="bottom-action-button">
                    <button class:border-top-light={$emoteMenuStore}>
                        <img src={emojiPickOn} style="padding: 2px" alt="Toggle emoji picker" />
                    </button>
                </div>
            </div>
            <div class="bottom-action-section tw-flex tw-flex-initial" in:fly={{}} on:click={toggleInviteMenu}>
                <button
                    class="btn light tw-m-0 tw-font-bold tw-text-xs sm:tw-text-base"
                    id="invite-btn"
                    class:border-top-light={$menuVisiblilityStore}
                >
                    {$LL.menu.sub.invite()}
                </button>
            </div>
        </div>
    </div>
</div>

<style lang="scss">
    .animated {
        transition-property: transform;
        transition-duration: 0.5s;
    }

    .translate-right {
        transform: translateX(2rem);
    }

    .translate-left {
        transform: translateX(-2rem);
    }

    @media only screen and (max-width: 640px) {
        //is equal to tailwind's sm breakpoint
        .translate-right {
            transform: translateX(0);
        }

        .translate-left {
            transform: translateX(0);
        }

        .move-menu {
            transform: translate(-3rem, -2rem);
        }
    }
</style>
