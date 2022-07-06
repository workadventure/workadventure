<script lang="ts">
  //import { fly } from "svelte/transition";
  //import ChatMessageForm from "./ChatMessageForm.svelte";
  import { afterUpdate, beforeUpdate, onMount } from "svelte";
  import { HtmlUtils } from "../Utils/HtmlUtils";
  //import { SettingsIcon, ArrowLeftIcon } from "svelte-feather-icons";
  //import ChatForum from "./ChatForum.svelte";
  import { connectionStore } from "../Stores/ConnectionStore";
  //import LL from "../i18n/i18n-svelte";
  import Loader from "./Loader.svelte";
  import {
    mucRoomsStore,
    xmppServerConnectionStatusStore,
  } from "../Stores/MucRoomsStore";
  import UsersList from "./UsersList.svelte";
  import { MucRoom } from "../Xmpp/MucRoom";
  import { userStore } from "../Stores/LocalUserStore";
  import LL from "../i18n/i18n-svelte";
  import { localeDetector } from "../i18n/locales";
  import { locale } from "../i18n/i18n-svelte";
  import ChatLiveRooms from "./ChatLiveRooms.svelte";
  import { activeThreadStore } from "../Stores/ActiveThreadStore";
  //import {get} from "svelte/store";
  import ChatActiveThread from "./ChatActiveThread.svelte";
  import { Ban, GoTo, RankDown, RankUp } from "../Type/CustomEvent";
  import ChatForums from "./ChatForums.svelte";

  let listDom: HTMLElement;
  let chatWindowElement: HTMLElement;
  let handleFormBlur: { blur(): void };
  let autoscroll: boolean;

  let searchValue = "";
  let showUsers = true;
  let showLives = true;
  let showForums = true;

  /*
    let forums = [
        {
            name: "Inside Workadventu.re",
            activeUsers: 5,
            unreads: 1,
        },
        {
            name: "Random",
            activeUsers: 12,
            unreads: 0,
        },
        {
            name: "World makers",
            activeUsers: 4,
            unreads: 5,
        },
    ];
     */

  beforeUpdate(() => {
    autoscroll =
      listDom &&
      listDom.offsetHeight + listDom.scrollTop > listDom.scrollHeight - 20;
  });

  onMount(() => {
    if (!$locale) {
      localeDetector();
    }
    listDom.scrollTo(0, listDom.scrollHeight);
  });

  afterUpdate(() => {
    if (autoscroll) listDom.scrollTo(0, listDom.scrollHeight);
  });

  function onClick(event: MouseEvent) {
    if (HtmlUtils.isClickedOutside(event, chatWindowElement)) {
      handleFormBlur.blur();
    }
  }

  function handleActiveThread(event: any) {
    activeThreadStore.set(event.detail);
  }
  function handleShowUsers() {
    showUsers = !showUsers;
  }
  function handleShowLives() {
    showLives = !showLives;
  }
  function handleShowForums() {
    showForums = !showForums;
  }

  function closeChat() {
    window.parent.postMessage({ type: "closeChat" }, "*");
    //document.activeElement?.blur();
  }
  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      closeChat();
    }
  }

  const defaultRoom = (): MucRoom => {
    const defaultMucRoom = [...$mucRoomsStore].find(
      (mucRoom) => mucRoom.type === "default"
    );
    if (!defaultMucRoom) {
      throw new Error("No default MucRoom");
    }
    return defaultMucRoom;
  };

  function handleGoTo(mucRoom: MucRoom | undefined, event: GoTo) {
    if (mucRoom) {
      mucRoom.goTo(event.type, event.playUri, event.type);
    }
  }
  function handleRankUp(mucRoom: MucRoom | undefined, event: RankUp) {
    if (mucRoom) {
      mucRoom.rankUp(event.jid);
    }
  }
  function handleRankDown(mucRoom: MucRoom | undefined, event: RankDown) {
    if (mucRoom) {
      mucRoom.rankDown(event.jid);
    }
  }
  function handleBan(mucRoom: MucRoom | undefined, event: Ban) {
    if (mucRoom) {
      mucRoom.ban(event.user, event.name, event.playUri);
    }
  }

  console.info("Chat fully loaded");
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" bind:this={chatWindowElement}>
  <section class="tw-p-0 tw-m-0" bind:this={listDom}>
    {#if !$connectionStore || !$xmppServerConnectionStatusStore}
      <Loader text={$userStore ? $LL.reconnecting() : $LL.waitingData()} />
    {:else if $activeThreadStore}
      <ChatActiveThread
        messagesStore={$activeThreadStore.getMessagesStore()}
        usersListStore={$activeThreadStore.getPresenceStore()}
        meStore={$activeThreadStore.getMeStore()}
        activeThread={$activeThreadStore}
        on:goTo={(event) => handleGoTo($activeThreadStore, event.detail)}
        on:rankUp={(event) => handleRankUp($activeThreadStore, event.detail)}
        on:rankDown={(event) =>
          handleRankDown($activeThreadStore, event.detail)}
        on:ban={(event) => handleBan($activeThreadStore, event.detail)}
      />
    {:else}
      <div>
        <!-- searchbar -->
        <div
          class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid"
        >
          <div class="tw-p-3">
            <input
              class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-px-3 tw-py-1 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
              placeholder={$LL.search()}
              bind:value={searchValue}
            />
          </div>
        </div>
        <!-- chat users -->
        <UsersList
          usersListStore={defaultRoom().getPresenceStore()}
          meStore={defaultRoom().getMeStore()}
          {showUsers}
          searchValue={searchValue.toLocaleLowerCase()}
          on:activeThread={handleActiveThread}
          on:showUsers={handleShowUsers}
          on:goTo={(event) =>
            defaultRoom().goTo(
              event.detail.type,
              event.detail.playUri,
              event.detail.uuid
            )}
          on:rankUp={(event) => defaultRoom().rankUp(event.detail.jid)}
          on:rankDown={(event) => defaultRoom().rankDown(event.detail.jid)}
          on:ban={(event) =>
            defaultRoom().ban(
              event.detail.user,
              event.detail.name,
              event.detail.playUri
            )}
        />

        <ChatLiveRooms
          {showLives}
          searchValue={searchValue.toLocaleLowerCase()}
          on:activeThread={handleActiveThread}
          on:showLives={handleShowLives}
          liveRooms={[...$mucRoomsStore].filter(
            (mucRoom) =>
              mucRoom.type === "live" &&
              mucRoom.name.toLowerCase().includes(searchValue)
          )}
        />

        <ChatForums
          {showForums}
          searchValue={searchValue.toLocaleLowerCase()}
          on:activeThread={handleActiveThread}
          on:showForums={handleShowForums}
          forums={[...$mucRoomsStore].filter(
            (mucRoom) =>
              mucRoom.type === "forum" &&
              mucRoom.name.toLowerCase().includes(searchValue)
          )}
        />

        <!-- forum list

					<div class="tw-border-b tw-border-solid tw-border-transparent tw-border-b-light-purple">
						<div class="tw-p-3 tw-flex tw-items-center">
							{#if forumListUnreads()}
						<span
								class="tw-bg-light-blue tw-text-dark-purple tw-w-5 tw-h-5 tw-mr-3 tw-text-sm tw-font-semibold tw-flex tw-items-center tw-justify-center tw-rounded"
						>
							{forumListUnreads()}
						</span>
							{/if}
							<p class="tw-text-light-blue tw-mb-0 tw-text-sm tw-flex-auto">Forums</p>
							<button
									class="tw-text-lighter-purple"
									on:click={() => {
							showForums = !showForums;
						}}
							>
								<ChevronUpIcon class={`tw-transform tw-transition ${showForums ? "" : "tw-rotate-180"}`} />
							</button>
						</div>
						{#if showForums}
							<div class="tw-mt-3">
								{#each forums as forum}
									<ChatForum {forum} {openForum} />
								{/each}
							</div>
							<div class="tw-px-4 tw-mb-6 tw-flex tw-justify-end">
								<button
										class="tw-underline tw-text-sm tw-text-lighter-purple tw-font-condensed hover:tw-underline"
								>See more…</button
								>
							</div>
						{/if}
					</div>
					-->
      </div>
    {/if}
  </section>
</aside>

<style lang="scss">
  aside.chatWindow {
    z-index: 1000;
    pointer-events: auto;
    position: absolute;
    top: 0;
    left: 0;
    min-height: 100vh;
    width: 100%;
    min-width: 350px;
    background: rgba(#1b1b29, 0.9);
    color: whitesmoke;
    display: flex;
    flex-direction: column;
  }
</style>
