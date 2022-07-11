<script lang="ts">
  import { UsersStore } from "../Xmpp/MucRoom";
  import ChatUser from "./ChatUser.svelte";
  import { createEventDispatcher } from "svelte";
  import { ChevronUpIcon } from "svelte-feather-icons";
  import { fly } from "svelte/transition";
  import LL from "../i18n/i18n-svelte";
  const dispatch = createEventDispatcher();

  export let usersListStore: UsersStore;
  export let showUsers: boolean;
  export let searchValue: string;

  let minimizeUser = true;
  const maxUsersMinimized = 7;

  function openChat(user: any) {
    return user;
    //dispatch('activeThread', user);
  }
</script>

<div>
  <div
    class="tw-border-b tw-border-solid tw-border-transparent tw-border-b-light-purple"
  >
    <div class="tw-p-3 tw-flex tw-items-center">
      <!--{#if usersListUnreads()}
                            <span
									class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
							>
                                {usersListUnreads()}
                            </span>
			{/if}-->
      <p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">
        {$LL.users()}
      </p>
      <button
        class="tw-text-lighter-purple"
        on:click={() => dispatch("showUsers")}
      >
        <ChevronUpIcon
          class={`tw-transform tw-transition ${
            showUsers ? "" : "tw-rotate-180"
          }`}
        />
      </button>
    </div>
    {#if showUsers}
      <div transition:fly={{ y: -30, duration: 100 }}>
        {#if [...$usersListStore].length === 0}
          <p>
            This room is empty, copy this link to invite colleague or friend!
          </p>
          <button type="button" class="nes-btn is-primary" on:click={null}
            >test</button
          >
        {:else}
          {#each [...$usersListStore]
            .splice(0, minimizeUser ? maxUsersMinimized : [...$usersListStore].length)
            .sort(([, a], [, b]) => Number(a.active) - Number(b.active))
            .filter(([, user]) => user.name
                .toLocaleLowerCase()
                .includes(searchValue)) as [ user]}
            <ChatUser
              {openChat}
              {user}
              on:goTo={(event) => dispatch("goTo", event.detail)}
            />
          {/each}
        {/if}
        {#if [...$usersListStore].length > maxUsersMinimized}
          <div
            class="tw-px-4 tw-mb-6  tw-flex tw-justify-end"
            on:click={() => (minimizeUser = !minimizeUser)}
          >
            <button
              class="tw-underline tw-text-sm tw-text-lighter-purple tw-font-condensed hover:tw-underline"
            >
              See {minimizeUser ? "more" : "less"}…
            </button>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>
