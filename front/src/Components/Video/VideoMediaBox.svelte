<script lang="ts">
  import type { VideoPeer } from "../../WebRtc/VideoPeer";
  import SoundMeterWidget from "../SoundMeterWidget.svelte";
  import microphoneCloseImg from "../images/microphone-close.svg";
  import reportImg from "./images/report.svg";
  import blockSignImg from "./images/blockSign.svg";
  import { showReportScreenStore } from "../../Stores/ShowReportScreenStore";
  import { getColorByString, getTextColorByBackgroundColor, srcObject } from "./utils";
  import { highlightedEmbedScreen } from "../../Stores/EmbedScreensStore";
  import type { EmbedScreen } from "../../Stores/EmbedScreensStore";
  import type { Streamable } from "../../Stores/StreamableCollectionStore";

  import Woka from "../Woka/Woka.svelte";
  import { onMount } from "svelte";
  import { isMediaBreakpointOnly } from "../../Utils/BreakpointsUtils";

  export let clickable = false;

  export let peer: VideoPeer;
  let streamStore = peer.streamStore;
  let volumeStore = peer.volumeStore;
  let name = peer.userName;
  let backGroundColor = getColorByString(peer.userName);
  let textColor = getTextColorByBackgroundColor(backGroundColor);
  let statusStore = peer.statusStore;
  let constraintStore = peer.constraintsStore;

  function openReport(peer: VideoPeer): void {
    showReportScreenStore.set({ userId: peer.userId, userName: peer.userName });
  }

  let embedScreen: EmbedScreen;
  let videoContainer: HTMLDivElement;
  let minimized = isMediaBreakpointOnly("md");

  if (peer) {
    embedScreen = {
      type: "streamable",
      embed: peer as unknown as Streamable
    };
  }

  function noDrag() {
    return false;
  }

  const resizeObserver = new ResizeObserver(() => {
    minimized = isMediaBreakpointOnly("md");
  });

  onMount(() => {
    resizeObserver.observe(videoContainer);
  });
</script>

<div
  class="video-container screen-blocker tw-flex tw-full tw-flex-col tw-h-full"
  class:no-clikable={!clickable}
  bind:this={videoContainer}
  on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
>
  {#if $statusStore === "connecting"}
    <div class="connecting-spinner" />
  {/if}
  {#if $statusStore === "error"}
    <div class="rtc-error" />
  {/if}
  <!-- svelte-ignore a11y-media-has-caption &ndash;&gt;-->
  <video
    class:no-video={!$constraintStore || $constraintStore.video === false}
    class="tw-w-full"
    use:srcObject={$streamStore}
    autoplay
    playsinline
    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}
  ></video>
</div>
<div class="nametag-container tw-flex tw-flex-col tw-absolute tw-justify-end
tw-w-32 sm:tw-w-40 md:tw-w-20 lg:tw-w-24 xl:tw-w-36 2xl:tw-w-48
tw-h-32 sm:tw-h-48 md:tw-h-20 lg:tw-h-24 xl:tw-h-36 2xl:tw-h-48

">
  <i class="tw-flex">
    <span style="background-color: {backGroundColor}; color: {textColor};" class="tw-rounded-tr-lg tw-pr-3 tw-pl-8 tw-py-1 tw-font-semibold tw-text-base tw-not-italic">{name}</span>
  </i>
</div>
<div class="woka-container tw-flex tw-flex-col tw-absolute tw-justify-end
tw-h-32 sm:tw-h-48 md:tw-h-20 lg:tw-h-24 xl:tw-h-36 2xl:tw-h-48 tw-pb-2
">
  <div class="tw-flex{($constraintStore && $constraintStore.video !== false) || minimized ? '' : 'no-video'}">
    <Woka userId={peer.userId} placeholderSrc={""} customHeight="32px" customWidth="32px"/>
  </div>
</div>

<!--<div-->
<!--    class="video-container screen-blocker"-->
<!--    class:no-clikable={!clickable}-->
<!--    bind:this={videoContainer}-->
<!--    on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}-->
<!--&gt;-->
<!--    {#if $statusStore === "connecting"}-->
<!--        <div class="connecting-spinner" />-->
<!--    {/if}-->
<!--    {#if $statusStore === "error"}-->
<!--        <div class="rtc-error" />-->
<!--    {/if}-->
<!--    &lt;!&ndash; {#if !$constraintStore || $constraintStore.video === false} &ndash;&gt;-->
<!--    <i class="container">-->
<!--        <span style="background-color: {backGroundColor}; color: {textColor};">{name}</span>-->
<!--    </i>-->
<!--    <div class="woka-icon {($constraintStore && $constraintStore.video !== false) || minimized ? '' : 'no-video'}">-->
<!--        <Woka userId={peer.userId} placeholderSrc={""} />-->
<!--    </div>-->
<!--    &lt;!&ndash; {/if} &ndash;&gt;-->
<!--    {#if $constraintStore && $constraintStore.audio === false}-->
<!--        <img-->
<!--            src={microphoneCloseImg}-->
<!--            class="active noselect"-->
<!--            draggable="false"-->
<!--            on:dragstart|preventDefault={noDrag}-->
<!--            alt="Muted"-->
<!--        />-->
<!--    {/if}-->
<!--    <button class="report" on:click|stopPropagation={() => openReport(peer)}>-->
<!--        <img alt="Report this user" draggable="false" on:dragstart|preventDefault={noDrag} src={reportImg} />-->
<!--        <span class="noselect">Report/Block</span>-->
<!--    </button>-->
<!--    &lt;!&ndash; svelte-ignore a11y-media-has-caption &ndash;&gt;-->
<!--    <video-->
<!--        class:no-video={!$constraintStore || $constraintStore.video === false}-->
<!--        use:srcObject={$streamStore}-->
<!--        autoplay-->
<!--        playsinline-->
<!--        on:click={() => (clickable ? highlightedEmbedScreen.toggleHighlight(embedScreen) : null)}-->
<!--    />-->
<!--    <img src={blockSignImg} draggable="false" on:dragstart|preventDefault={noDrag} class="block-logo" alt="Block" />-->
<!--    {#if $constraintStore && $constraintStore.audio !== false}-->
<!--        <SoundMeterWidget volume={$volumeStore} />-->
<!--    {/if}-->
<!--</div>-->

<style lang="scss">
  //.container {
  //  display: flex;
  //  flex-direction: column;
  //}

  video.no-video {
    visibility: collapse;
  }
</style>
