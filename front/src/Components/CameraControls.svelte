<script lang="ts">
  import { requestedScreenSharingState, screenSharingAvailableStore } from "../Stores/ScreenSharingStore";
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
  import emojiPickOff from "./images/emoji-off.png";
  import { LayoutMode } from "../WebRtc/LayoutManager";
  import { peerStore } from "../Stores/PeerStore";
  import { embedScreenLayoutStore } from "../Stores/EmbedScreensStore";
  import { followRoleStore, followStateStore, followUsersStore } from "../Stores/FollowStore";
  import { gameManager } from "../Phaser/Game/GameManager";
  import { currentPlayerGroupLockStateStore } from "../Stores/CurrentPlayerGroupStore";
  import { analyticsClient } from "../Administration/AnalyticsClient";
  import { chatVisibilityStore } from "../Stores/ChatStore";
  import { activeSubMenuStore, menuVisiblilityStore } from "../Stores/MenuStore";
  import { emoteMenuStore } from "../Stores/EmoteStore";
  import LL from "../i18n/i18n-svelte";

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
  class="bottom-action-bar">
  <div class="bottom-action-section">
    <div class="tw-transition-all bottom-action-button"
         class:tw-opacity-0={($peerStore.size === 0 && $followStateStore === "off") || $silentStore}
         class:tw-invisible={($peerStore.size === 0 && $followStateStore === "off") || $silentStore}
         class:disabled={$followStateStore !== "off"}
         on:click={() => analyticsClient.follow()}
         on:click={followClick}>
      <button

        class:border-top-light={$followStateStore === "active"}>
        <img src={followImg} style="padding: 2px" alt="Toggle follow" />
      </button>
    </div>


    <div class="tw-transition-all bottom-action-button"
         on:click={switchLayoutMode}
         class:tw-opacity-0={$peerStore.size === 0}>
      <button>
        {#if $embedScreenLayoutStore === LayoutMode.Presentation}
          <img src={layoutPresentationImg} style="padding: 2px"
               alt="Switch to mosaic mode" />
        {:else}
          <img src={layoutChatImg} style="padding: 2px"
               alt="Switch to presentation mode" />
        {/if}
      </button>
    </div>

    <div class="tw-transition-all bottom-action-button"
         class:tw-opacity-0={$peerStore.size === 0 || $silentStore}
         class:disabled={$currentPlayerGroupLockStateStore}
         on:click={() => analyticsClient.lockDiscussion()}
         on:click={lockClick}>
      <button class=" "
              class:border-top-light={$currentPlayerGroupLockStateStore}>
        {#if $currentPlayerGroupLockStateStore}
          <img src={lockCloseImg} style="padding: 2px" alt="Unlock videochat bubble" />
        {:else}
          <img src={lockOpenImg} style="padding: 2px" alt="Lock videochat bubble" />
        {/if}
      </button>
    </div>

    <div class="tw-transition-all bottom-action-button"
         on:click={() => analyticsClient.screenSharing()}
         on:click={screenSharingClick}
         class:tw-opacity-0={!$screenSharingAvailableStore || $silentStore}
         class:enabled={$requestedScreenSharingState}>
      <button

        class:border-top-light={$requestedScreenSharingState}>
        {#if $requestedScreenSharingState && !$silentStore}
          <img src={screenshareOn} alt="Stop screen sharing" />
        {:else}
          <img src={screenshareOff} alt="Start screen sharing" />
        {/if}
      </button>
    </div>
  </div>

  <div class="bottom-action-section">
    <div class="bottom-action-button"
         on:click={() => analyticsClient.camera()}
         on:click={cameraClick}
         class:disabled={!$requestedCameraState || $silentStore}>
      <button

        class:border-top-light={$requestedCameraState}>
        {#if $requestedCameraState && !$silentStore}
          <img src={cameraImg} alt="Turn off webcam" />
        {:else}
          <img src={cameraOffImg} alt="Turn on webcam" />
        {/if}
      </button>
    </div>

    <div class="bottom-action-button"
         on:click={() => analyticsClient.microphone()}
         on:click={microphoneClick}
         class:disabled={!$requestedMicrophoneState || $silentStore}>
      <button
        class:border-top-light={$requestedMicrophoneState}>
        {#if $requestedMicrophoneState && !$silentStore}
          <img src={microphoneImg} alt="Turn off microphone" />
        {:else}
          <img src={microphoneOffImg} alt="Turn on microphone" />
        {/if}
      </button>
    </div>

    <div on:click={() => analyticsClient.openedChat()}
         on:click={toggleChat}
         class="bottom-action-button"
    >
      <button

        class:border-top-light={$chatVisibilityStore}
      >
        <img src={bubbleImg} style="padding: 2px" alt="Toggle chat" />
      </button>
    </div>
    <div
      on:click={toggleEmojiPicker}
      class="bottom-action-button"
    >
      <button

        class:border-top-light={$emoteMenuStore}
      >
        {#if $emoteMenuStore}
          <img src={emojiPickOn} style="padding: 2px" alt="Toggle emoji picker" />
        {:else}
          <img src={emojiPickOff} style="padding: 2px" alt="Toggle emoji picker" />
        {/if}
      </button>
    </div>
  </div>

  <div class="bottom-action-section"
       on:click={toggleInviteMenu}
  >
    <button class="btn light tw-m-0 tw-font-bold tw-text-xs sm:tw-text-base"
            class:border-top-light={$menuVisiblilityStore}
    >
      {$LL.menu.sub.invite()}
    </button>
  </div>
</div>

<style lang="scss">
  @import "../../style/breakpoints.scss";
</style>
