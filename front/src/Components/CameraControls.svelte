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
  import { LayoutMode } from "../WebRtc/LayoutManager";
  import { peerStore } from "../Stores/PeerStore";
  import { embedScreenLayoutStore } from "../Stores/EmbedScreensStore";
  import { followRoleStore, followStateStore, followUsersStore } from "../Stores/FollowStore";
  import { gameManager } from "../Phaser/Game/GameManager";
  import { currentPlayerGroupLockStateStore } from "../Stores/CurrentPlayerGroupStore";
  import { analyticsClient } from "../Administration/AnalyticsClient";
  import { chatVisibilityStore } from "../Stores/ChatStore";
  import { activeSubMenuStore, menuVisiblilityStore } from "../Stores/MenuStore";

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
</script>

<div
  class="tw-flex tw-flew-row tw-pointer-events-auto tw-left-0 tw-right-0 tw-justify-center tw-m-auto tw-bottom-1 tw-absolute tw-z-[251] hover:-tw-translate-y-4 tw-transition-transform tw-duration-300">
  <div class="btn-action-bar-base tw-flex tw-flex-row tw-mx-2">
    <div class="tw-transition-all test-transition"
         class:tw-opacity-0={($peerStore.size === 0 && $followStateStore === "off") || $silentStore}
         class:tw-invisible={($peerStore.size === 0 && $followStateStore === "off") || $silentStore}
         class:disabled={$followStateStore !== "off"}
         on:click={() => analyticsClient.follow()}
         on:click={followClick}>
      <button
        class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-l-l tw-rounded-r-none hover:tw-bg-medium-purple/95 tw-m-0"
        class:border-top-light={$followStateStore === "active"}>
        <img class="noselect tw-w-6 tw-h-6" src={followImg} style="padding: 2px" alt="Switch to mosaic mode" />
      </button>
    </div>


    <div class="tw-transition-all test-transition"
         on:click={switchLayoutMode}
         class:tw-opacity-0={$peerStore.size === 0}>
      <button class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-none hover:tw-bg-medium-purple/95 tw-m-0">
        {#if $embedScreenLayoutStore === LayoutMode.Presentation}
          <img class="noselect tw-w-6 tw-h-6" src={layoutPresentationImg} style="padding: 2px"
               alt="Switch to mosaic mode" />
        {:else}
          <img class="noselect tw-w-6 tw-h-6" src={layoutChatImg} style="padding: 2px"
               alt="Switch to presentation mode" />
        {/if}
      </button>
    </div>

    <div class="tw-transition-all test-transition"
         class:tw-opacity-0={$peerStore.size === 0 || $silentStore}
         class:disabled={$currentPlayerGroupLockStateStore}
         on:click={() => analyticsClient.lockDiscussion()}
         on:click={lockClick}>
      <button class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-none hover:tw-bg-medium-purple/95 tw-m-0"
              class:border-top-light={$currentPlayerGroupLockStateStore}>
        {#if $currentPlayerGroupLockStateStore}
          <img class="noselect tw-w-6 tw-h-6" src={lockCloseImg} style="padding: 2px" alt="Switch to mosaic mode" />
        {:else}
          <img class="noselect tw-w-6 tw-h-6" src={lockOpenImg} style="padding: 2px" alt="Switch to mosaic mode" />
        {/if}
      </button>
    </div>

    <div class="tw-transition-all test-transition"
         on:click={() => analyticsClient.screenSharing()}
         on:click={screenSharingClick}
         class:tw-opacity-0={!$screenSharingAvailableStore || $silentStore}
         class:enabled={$requestedScreenSharingState}>
      <button
        class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-r-l tw-rounded-l-none hover:tw-bg-medium-purple/95 tw-m-0"
        class:border-top-light={$requestedScreenSharingState}>
        {#if $requestedScreenSharingState && !$silentStore}
          <img class="noselect tw-w-6 tw-h-6" src={screenshareOn} alt="Start screen sharing" />
        {:else}
          <img class="noselect tw-w-6 tw-h-6" src={screenshareOff} alt="Stop screen sharing" />
        {/if}
      </button>
    </div>
  </div>

  <div class="btn-action-bar-base tw-flex tw-flex-row tw-mx-2 ">
    <div on:click={() => analyticsClient.camera()}
         on:click={cameraClick}
         class:disabled={!$requestedCameraState || $silentStore}>
      <button
        class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-l-l tw-rounded-r-none hover:tw-bg-medium-purple/95 tw-m-0"
        class:border-top-light={$requestedCameraState}>
        {#if $requestedCameraState && !$silentStore}
          <img class="noselect tw-w-5 tw-h-5 tw-bottom-1" src={cameraImg} alt="Turn on webcam" />
        {:else}
          <img class="noselect tw-w-5 tw-h-5 tw-bottom-1" src={cameraOffImg} alt="Turn off webcam" />
        {/if}
      </button>
    </div>

    <div
      on:click={() => analyticsClient.microphone()}
      on:click={microphoneClick}
      class:disabled={!$requestedMicrophoneState || $silentStore}>
      <button class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-none hover:tw-bg-medium-purple/95 tw-m-0"
              class:border-top-light={$requestedMicrophoneState}>
        {#if $requestedMicrophoneState && !$silentStore}
          <img class="noselect tw-w-5 tw-h-5 tw-bottom-1" src={microphoneImg} alt="Turn on microphone" />
        {:else}
          <img class="noselect tw-w-5 tw-h-5 tw-bottom-1" src={microphoneOffImg} alt="Turn off microphone" />
        {/if}
      </button>
    </div>

    <div on:click={() => analyticsClient.openedChat()}
         on:click={toggleChat}
    >
      <button
        class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-r-l tw-rounded-l-none hover:tw-bg-medium-purple/95 tw-m-0"
        class:border-top-light={$chatVisibilityStore}
      >
        <img class="noselect tw-w-5 tw-h-5 tw-bottom-1" src={bubbleImg} style="padding: 2px" alt="Switch to mosaic mode" />
      </button>
    </div>
  </div>

  <div class="btn-action-bar-invite w-flex tw-flex-row tw-mx-2"
       on:click={toggleInviteMenu}
  >
    <button class="btn light tw-h-10 tw-m-0 tw-font-bold"
            class:border-top-light={$menuVisiblilityStore}
    >
      Invite !
    </button>
  </div>
</div>

<style lang="scss">
  @import "../../style/breakpoints.scss";

  .border-top-light {
    border-top: 4px solid theme("colors.light-blue");
    padding-top: 0.25rem;
  }
</style>
