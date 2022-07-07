<script lang="ts">
  import { fly } from "svelte/transition";
  import { ChevronUpIcon } from "svelte-feather-icons";
  import ChatLineRoom from "./ChatLineRoom.svelte";
  import { createEventDispatcher } from "svelte";
  import { MucRoom } from "../Xmpp/MucRoom";
  import {derived} from "svelte/store";
  const dispatch = createEventDispatcher();

  export let forums: MucRoom[];
  export let showForums: Boolean;
  export let searchValue: string;

  function open(liveRoom: MucRoom) {
    dispatch("activeThread", liveRoom);
  }
  const totals = derived(
          forums.map(forum => forum.getCountMessagesToSee()),
          $totals => $totals.reduce((sum, number) => sum + number, 0)
  );
  </script>

{#if forums.length > 0}
  <div
    class="tw-border-b tw-border-solid tw-border-0 tw-border-transparent tw-border-b-light-purple"
    transition:fly={{ y: -30, duration: 100 }}
  >
    <div class="tw-px-4 tw-py-1 tw-flex tw-items-center">
      {#if $totals}
        <span
          class="tw-animate-pulse tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
        >
          {$totals}
        </span>
      {/if}
      <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Forums</p>
      <button
        class="tw-text-lighter-purple"
        on:click={() => dispatch("showForums")}
      >
        <ChevronUpIcon
          class={`tw-transform tw-transition ${
            showForums ? "" : "tw-rotate-180"
          }`}
        />
      </button>
    </div>
    {#if showForums}
      <div transition:fly={{ y: -30, duration: 100 }}>
        {#each forums as forum}
          <ChatLineRoom
            mucRoom={forum}
            {searchValue}
            meStore={forum.getMeStore()}
            usersListStore={forum.getPresenceStore()}
            messagesStore={forum.getMessagesStore()}
            {open}
          />
        {/each}
      </div>
    {/if}
  </div>
{/if}
