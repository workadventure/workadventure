<script lang="ts">
  import { afterUpdate, beforeUpdate, onMount } from "svelte";
  import { HtmlUtils } from "../Utils/HtmlUtils";
  import { connectionStore } from "../Stores/ConnectionStore";
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
  import ChatActiveThread from "./ChatActiveThread.svelte";
  import { Ban, GoTo, RankDown, RankUp } from "../Type/CustomEvent";
  import ChatActiveThreadTimeLine from "./Timeline/ChatActiveThreadTimeline.svelte";
  import Timeline from "./Timeline/Timeline.svelte";
  import { timelineOpenedStore } from "../Stores/ChatStore";

  let listDom: HTMLElement;
  let chatWindowElement: HTMLElement;
  let handleFormBlur: { blur(): void };
  let autoscroll: boolean;

  let searchValue = "";
  let showUsers = true;
  let showLives = true;
  let activeThreadTimeLine = false;

  beforeUpdate(() => {
    autoscroll =
      listDom &&
      listDom.offsetHeight + listDom.scrollTop > listDom.scrollHeight - 20;
  });

  onMount(async () => {
    if (!$locale) {
      await localeDetector();
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

  function handleActiveThread(event: unknown) {
    activeThreadStore.set((event as { detail: MucRoom | undefined }).detail);
  }
  function handleShowUsers() {
    showUsers = !showUsers;
  }
  function handleShowLives() {
    showLives = !showLives;
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

  let defaultMucRoom = undefined;
  mucRoomsStore.subscribe(() => {
    try {
      defaultMucRoom = mucRoomsStore.getDefaultRoom();
    } catch (e: Error) {
      console.log(e);
    }
  });

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
    {:else if activeThreadTimeLine}
      <ChatActiveThreadTimeLine
        on:unactiveThreadTimeLine={() => (activeThreadTimeLine = false)}
      />
    {:else if $activeThreadStore && defaultMucRoom}
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
      <div class="wa-message-bg">
        <!-- searchbar -->
        <div
          class="tw-border tw-border-transparent tw-border-b-light-purple tw-border-solid"
        >
          <div class="tw-p-3">
            <input
              class="wa-searchbar tw-block tw-text-white tw-w-full placeholder:tw-text-sm tw-rounded-3xl tw-px-3 tw-py-1 tw-border-light-purple tw-border tw-border-solid tw-bg-transparent"
              placeholder={$LL.search()}
              bind:value={searchValue}
              on:input={() => timelineOpenedStore.set(false)}
            />
          </div>
        </div>
        <!-- chat users -->
        {#if defaultMucRoom !== undefined}
          <UsersList
            {showUsers}
            usersListStore={defaultMucRoom.getPresenceStore()}
            meStore={defaultMucRoom.getMeStore()}
            searchValue={searchValue.toLocaleLowerCase()}
            on:activeThread={handleActiveThread}
            on:showUsers={handleShowUsers}
            on:goTo={(event) =>
              defaultMucRoom.goTo(
                event.detail.type,
                event.detail.playUri,
                event.detail.uuid
              )}
            on:rankUp={(event) => defaultMucRoom.rankUp(event.detail.jid)}
            on:rankDown={(event) => defaultMucRoom.rankDown(event.detail.jid)}
            on:ban={(event) =>
              defaultMucRoom.ban(
                event.detail.user,
                event.detail.name,
                event.detail.playUri
              )}
          />
        {/if}

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

        <Timeline
          on:activeThreadTimeLine={() => (activeThreadTimeLine = true)}
        />
      </div>
    {/if}
  </section>
</aside>

<style lang="scss">
  aside.chatWindow {
    pointer-events: auto;
    //background: rgba(27, 27, 41, 0.79);
    color: whitesmoke;
    display: flex;
    flex-direction: column;
  }
</style>
