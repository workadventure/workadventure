<script lang="ts">
  import { requestedScreenSharingState, screenSharingAvailableStore } from "../Stores/ScreenSharingStore";
  import { requestedCameraState, requestedMicrophoneState, silentStore } from "../Stores/MediaStore";
  import monitorImg from "./images/monitor.png";
  import monitorCloseImg from "./images/monitor-close.svg";
  import cameraImg from "./images/camera.png";
  import cinemaCloseImg from "./images/cinema-close.svg";
  import microphoneImg from "./images/microphone.png";
  import microphoneCloseImg from "./images/microphone-close.svg";
  import layoutPresentationImg from "./images/layout-presentation.svg";
  import layoutChatImg from "./images/layout-chat.svg";
  import followImg from "./images/follow.svg";
  import lockImg from "./images/lock.svg";
  import bubbleImg from "./images/bubble-talk.png";
  import inviteImg from "./images/share.png";
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

  function toggleInviteMenu(){
    activeSubMenuStore.set(2);
    menuVisiblilityStore.set(!$menuVisiblilityStore);
  }
</script>

<!-- TEST -->
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
        class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-l-l tw-rounded-r-none hover:tw-bg-medium-purple/95 tw-m-0">
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
      <button class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-none hover:tw-bg-medium-purple/95 tw-m-0">
        <img class="noselect tw-w-6 tw-h-6" src={lockImg} style="padding: 2px" alt="Switch to mosaic mode" />
      </button>
    </div>

    <div class="tw-transition-all test-transition"
         on:click={() => analyticsClient.screenSharing()}
         on:click={screenSharingClick}
         class:tw-opacity-0={!$screenSharingAvailableStore || $silentStore}
         class:enabled={$requestedScreenSharingState}>
      <button
        class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-r-l tw-rounded-l-none hover:tw-bg-medium-purple/95 tw-m-0">
        {#if $requestedScreenSharingState && !$silentStore}
          <img class="noselect tw-w-6 tw-h-6" src={monitorImg} alt="Start screen sharing" />
        {:else}
          <img class="noselect tw-w-6 tw-h-6" src={monitorCloseImg} alt="Stop screen sharing" />
        {/if}
      </button>
    </div>
  </div>

  <div class="btn-action-bar-base tw-flex tw-flex-row tw-mx-2 ">
    <div on:click={() => analyticsClient.camera()}
         on:click={cameraClick}
         class:disabled={!$requestedCameraState || $silentStore}>
      <button
        class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-l-l tw-rounded-r-none hover:tw-bg-medium-purple/95 tw-m-0">
        {#if $requestedCameraState && !$silentStore}
          <img class="noselect tw-h-6 tw-w-6" src={cameraImg} alt="Turn on webcam" />
        {:else}
          <img class="noselect tw-h-6 tw-w-6" src={cinemaCloseImg} alt="Turn off webcam" />
        {/if}
      </button>
    </div>

    <div
      on:click={() => analyticsClient.microphone()}
      on:click={microphoneClick}
      class:disabled={!$requestedMicrophoneState || $silentStore}>
      <button class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-none hover:tw-bg-medium-purple/95 tw-m-0">
        {#if $requestedMicrophoneState && !$silentStore}
          <img class="noselect tw-h-6 tw-w-6" src={microphoneImg} alt="Turn on microphone" />
        {:else}
          <img class="noselect tw-h-6 tw-w-6" src={microphoneCloseImg} alt="Turn off microphone" />
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
        <img class="noselect tw-h-6 tw-w-6" src={bubbleImg} style="padding: 2px" alt="Switch to mosaic mode" />
      </button>
    </div>
  </div>

  <div class="btn-action-bar-invite w-flex tw-flex-row tw-mx-2"
       on:click={toggleInviteMenu}
  >
    <button class="tw-bg-dark-purple/95 tw-w-10 tw-h-10 tw-p-2 tw-rounded-lg hover:tw-bg-medium-purple/95 tw-m-0"
            class:border-top-light={$menuVisiblilityStore}
    >
      <img class="noselect tw-h-6 tw-w-6" src={inviteImg} style="padding: 2px" alt="Switch to mosaic mode" />
    </button>
  </div>
</div>
<!--END TEST-->

<div class="btn-cam-action tw-invisible">
  <div class="btn-layout" on:click={switchLayoutMode} class:hide={$peerStore.size === 0}>
    {#if $embedScreenLayoutStore === LayoutMode.Presentation}
      <img class="noselect tw-h-6 tw-w-6" src={layoutPresentationImg} style="padding: 2px" alt="Switch to mosaic mode" />
    {:else}
      <img class="noselect tw-h-6 tw-w-6" src={layoutChatImg} style="padding: 2px" alt="Switch to presentation mode" />
    {/if}
  </div>

  <div
    class="btn-follow"
    class:hide={($peerStore.size === 0 && $followStateStore === "off") || $silentStore}
    class:disabled={$followStateStore !== "off"}
    on:click={() => analyticsClient.follow()}
    on:click={followClick}
  >
    <img class="noselect" src={followImg} alt="" />
  </div>

  <div
    class="btn-lock"
    class:hide={$peerStore.size === 0 || $silentStore}
    class:disabled={$currentPlayerGroupLockStateStore}
    on:click={() => analyticsClient.lockDiscussion()}
    on:click={lockClick}
  >
    <img class="noselect" src={lockImg} alt="" />
  </div>

  <div
    class="btn-monitor"
    on:click={() => analyticsClient.screenSharing()}
    on:click={screenSharingClick}
    class:hide={!$screenSharingAvailableStore || $silentStore}
    class:enabled={$requestedScreenSharingState}
  >
    {#if $requestedScreenSharingState && !$silentStore}
      <img class="noselect" src={monitorImg} alt="Start screen sharing" />
    {:else}
      <img class="noselect" src={monitorCloseImg} alt="Stop screen sharing" />
    {/if}
  </div>

  <div
    class="btn-video"
    on:click={() => analyticsClient.camera()}
    on:click={cameraClick}
    class:disabled={!$requestedCameraState || $silentStore}
  >
    {#if $requestedCameraState && !$silentStore}
      <img class="noselect" src={cameraImg} alt="Turn on webcam" />
    {:else}
      <img class="noselect" src={cinemaCloseImg} alt="Turn off webcam" />
    {/if}
  </div>

  <div
    class="btn-micro"
    on:click={() => analyticsClient.microphone()}
    on:click={microphoneClick}
    class:disabled={!$requestedMicrophoneState || $silentStore}
  >
    {#if $requestedMicrophoneState && !$silentStore}
      <img class="noselect" src={microphoneImg} alt="Turn on microphone" />
    {:else}
      <img class="noselect" src={microphoneCloseImg} alt="Turn off microphone" />
    {/if}
  </div>
</div>

<style lang="scss">
  @import "../../style/breakpoints.scss";

  .action-b-btn {
    background-color: theme("colors.medium-purple");
    opacity: 0.95;
  }

  .action-b-btn:hover {
    background-color: theme("colors.light-purple");
  }

  .btn-cam-action {
    pointer-events: all;
    position: absolute;
    display: inline-flex;
    bottom: 10px;
    right: 15px;
    width: 360px;
    height: 40px;
    text-align: center;
    align-content: center;
    justify-content: flex-end;
    z-index: 251;

    &:hover {
      div.hide {
        transform: translateY(60px);
      }
    }
  }

  /*btn animation*/
  .btn-cam-action div {
    cursor: url("../../style/images/cursor_pointer.png"), pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    border: solid 0px black;
    width: 44px;
    height: 44px;
    box-shadow: 2px 2px 24px #444;
    border-radius: 48px;
    transform: translateY(15px);
    transition-timing-function: ease-in-out;
    transition: all 0.3s;
    margin: 0 2%;

    &.hide {
      transform: translateY(60px);
    }
  }

  .btn-cam-action div.disabled {
    background: #d75555;
  }

  .btn-cam-action div.enabled {
    background: #73c973;
  }

  .btn-cam-action:hover div {
    transform: translateY(0);
  }

  .btn-cam-action div:hover {
    box-shadow: 4px 4px 48px #666;
    transition: 120ms;
  }

  .btn-micro {
    pointer-events: auto;
  }

  .btn-video {
    pointer-events: auto;
    transition: all 0.25s;
  }

  .btn-monitor {
    pointer-events: auto;
  }

  .btn-layout {
    pointer-events: auto;
    transition: all 0.15s;
  }

  .btn-cam-action div img {
    height: 22px;
    width: 30px;
    position: relative;
    cursor: url("../../style/images/cursor_pointer.png"), pointer;
  }

  .btn-follow {
    pointer-events: auto;

    img {
      filter: brightness(0) invert(1);
    }
  }

  .btn-lock {
    pointer-events: auto;

    img {
      filter: brightness(0) invert(1);
    }
  }

  @media (hover: none) {
    /**
    * If we cannot hover over elements, let's display camera button in full.
    */
    .btn-cam-action {
      div {
        transform: translateY(0px);
      }
    }
  }

  @include media-breakpoint-up(sm) {
    .btn-cam-action {
      right: 0;
      width: 100%;
      height: 40%;
      max-height: 40px;

      div {
        width: 20%;
        max-height: 44px;
      }
    }
  }

  .border-top-light{
    border-top: 4px solid theme("colors.light-blue")
  }
</style>
