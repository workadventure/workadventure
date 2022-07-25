<script lang="ts">
  import { fly } from "svelte/transition";
  import {
    SettingsIcon,
    ArrowLeftIcon,
    MessageCircleIcon,
  } from "svelte-feather-icons";
  import ChatMessageForm from "./ChatMessageForm.svelte";
  import { activeThreadStore } from "../Stores/ActiveThreadStore";
  import ChatMessagesList from "./ChatMessagesList.svelte";
  import {SingleRoom} from "../Xmpp/SingleRoom";

  export let activeSingleRoom: SingleRoom;
  export let settingsView = false;

  let messagesList: ChatMessagesList;

</script>

<!-- thread -->
<div
        class="tw-flex tw-flex-col tw-h-full tw-min-h-full tw-over tw-w-full"
        transition:fly={{ x: 500, duration: 400 }}
>
  <div class="wa-thread-head">
    <div
            class="tw-border tw-border-transparent tw-border-r-light-purple tw-border-solid tw-py-1 tw-pr-2 tw-border-t-0 tw-border-b-0 tw-self-stretch tw-flex tw-justify-center tw-align-middle"
    >
      <button
              class="tw-text-lighter-purple tw-m-0"
              on:click={() => {
          activeThreadStore.reset();
        }}
      >
        <ArrowLeftIcon />
      </button>
    </div>
    <div class="tw-text-center tw-pt-1 tw-pb-2">
      <div class="tw-flex">
        <b>{activeSingleRoom.user.name}</b>
      </div>
    </div>
    <div
            class="tw-border tw-border-transparent tw-border-l-light-purple tw-border-solid tw-py-1 tw-pl-2 tw-border-t-0 tw-border-b-0 tw-self-stretch tw-flex tw-justify-center tw-align-middle"
            on:click={() => (settingsView = !settingsView)}
    >
      <button class="tw-text-lighter-purple tw-m-0">
        {#if settingsView}
          <MessageCircleIcon />
        {:else}
          <SettingsIcon />
        {/if}
      </button>
    </div>
  </div>
  {#if settingsView}
    <div
            in:fly={{ y: -100, duration: 100, delay: 200 }}
            out:fly={{ y: -100, duration: 100 }}
            class="tw-flex tw-flex-col tw-flex-auto tw-overflow-auto tw-w-full"
            style="margin-top: 52px"
    >
      <div
              class="wa-message-bg tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid tw-px-5"
      >
        <p class="tw-py-3 tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
          One to One feed
        </p>
      </div>
    </div>
  {:else}
    <ChatMessagesList room={activeSingleRoom} bind:this={messagesList} />

    <div class="messageForm">
      <ChatMessageForm
              room={activeSingleRoom}
              on:scrollDown={messagesList.scrollDown}
      />
    </div>
  {/if}
</div>

<style lang="scss">
  .messageForm {
    position: fixed;
    bottom: 0;
    width: 100%;
  }
</style>
