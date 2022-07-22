<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import {
    ChatStates,
    defaultColor,
    defaultWoka,
    MucRoom,
    User,
  } from "../Xmpp/MucRoom";
  import LL, { locale } from "../i18n/i18n-svelte";
  import { userStore } from "../Stores/LocalUserStore";
  import { mucRoomsStore } from "../Stores/MucRoomsStore";
  import { UserData } from "../Messages/JsonMessages/ChatData";
  import { onDestroy, onMount } from "svelte";
  import {
    AlertCircleIcon,
    Trash2Icon,
    RefreshCwIcon,
    ArrowDownIcon,
  } from "svelte-feather-icons";
  import { Unsubscriber } from "svelte/store";

  export let mucRoom: MucRoom;

  $: unreads = mucRoom.getCountMessagesToSee();
  $: messagesStore = mucRoom.getMessagesStore();

  let lastDate: Date;
  let isScrolledDown = false;

  $: presenseStore = mucRoomsStore.getDefaultRoom().getPresenceStore();

  function needHideHeader(name: string, date: Date, i: number) {
    let previousMsg = $messagesStore[i - 1];
    if (!previousMsg) {
      return false;
    }
    const minutesBetween =
      (((date.getTime() - previousMsg.time.getTime()) % 86400000) % 3600000) /
      60000;
    return previousMsg.name === name && minutesBetween < 2;
  }
  function showDate(date: Date) {
    if (!lastDate) {
      lastDate = date;
      return true;
    } else {
      return date.toDateString() !== lastDate.toDateString();
    }
  }
  function isMe(name: string) {
    return name === mucRoom.getPlayerName();
  }

  function findUserInDefault(name: string): User | UserData | undefined {
    if (isMe(name)) {
      return $userStore;
    }
    const userData = [...$presenseStore].find(([, user]) => user.name === name);
    let user = undefined;
    if (userData) {
      [, user] = userData;
    }
    return user;
  }

  function getWoka(name: string) {
    const user = findUserInDefault(name);
    if (user) {
      return user.woka;
    } else {
      return defaultWoka;
    }
  }

  function getColor(name: string) {
    const user = findUserInDefault(name);
    if (user) {
      return user.color;
    } else {
      return defaultColor;
    }
  }

  export const scrollDown = () => {
    setTimeout(() => {
      window.scroll(0, document.documentElement.scrollHeight);
    }, 0);
  };

  const scrollDownAndRead = () => {
    mucRoom.lastMessageSeen = new Date();
    mucRoom.getCountMessagesToSee().set(0);
    scrollDown();
  };


  let subscribers = new Array<Unsubscriber>();

  onMount(() => {
    window.addEventListener("scroll", () => {
      if (
        window.innerHeight + window.scrollY ===
        document.documentElement.scrollHeight
      ) {
        isScrolledDown = true;
        if($unreads > 0) {
          mucRoom.lastMessageSeen = new Date();
          mucRoom.getCountMessagesToSee().set(0);
        }
      } else {
        isScrolledDown = false;
      }
    });

    subscribers.push(mucRoom.getMessagesStore().subscribe(() => {
      if(isScrolledDown){
        scrollDownAndRead();
      }
    }));

    if($unreads === 0){
      isScrolledDown = true;
      scrollDown();
    }
  });

  onDestroy(() => {
    window.removeEventListener("scroll", () => null);
    subscribers.forEach(subscriber => subscriber());
  });

  $: usersStore = mucRoom.getPresenceStore();
</script>

<div
  class="tw-flex tw-flex-col tw-flex-auto tw-px-5 tw-overflow-y-scroll tw-pt-14 tw-pb-14 tw-justify-end tw-overflow-y-scroll tw-h-auto tw-min-h-screen"
>
  {#each $messagesStore as message, i}
    {#if showDate(message.time)}
      <div class="wa-separator">
        {message.time.toLocaleDateString($locale, {
          year: "numeric",
          month: "short",
          day: "numeric",
        })}
      </div>
    {/if}
    <div
      class={`tw-flex ${
        isMe(message.name) ? "tw-justify-end" : "tw-justify-start"
      }
            ${
              needHideHeader(message.name, message.time, i)
                ? "tw-mt-0.5"
                : "tw-mt-2"
            }`}
    >
      <div
        class={`tw-flex ${
          isMe(message.name) ? "tw-justify-end" : "tw-justify-start"
        }`}
      >
        <div class="tw-flex tw-flex-row tw-items-center">
          <div
            class={`tw-flex ${
              isMe(message.name) ? "tw-justify-end" : "tw-justify-start"
            }`}
          >
            <div
              class={`${
                isMe(message.name) ||
                needHideHeader(message.name, message.time, i)
                  ? "tw-opacity-0"
                  : "tw-mt-4"
              } tw-relative wa-avatar-mini tw-mr-2`}
              transition:fade={{ duration: 100 }}
              style={`background-color: ${getColor(message.name)}`}
            >
              <div class="wa-container">
                <img
                  class="tw-w-full"
                  src={getWoka(message.name)}
                  alt="Avatar"
                  loading="lazy"
                />
              </div>
            </div>
            <div
              class={`tw-w-3/4`}
              transition:fly={{
                x: isMe(message.name) ? 10 : -10,
                delay: 100,
                duration: 200,
              }}
            >
              <div
                style={`border-bottom-color:${getColor(message.name)}`}
                class={`tw-flex tw-items-end tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-0.5 ${
                  needHideHeader(message.name, message.time, i)
                    ? "tw-hidden"
                    : ""
                } ${
                  isMe(message.name) ? "tw-flex-row-reverse" : "tw-flex-row"
                }`}
              >
                <span
                  class={`tw-text-lighter-purple ${
                    isMe(message.name) ? "tw-ml-2" : "tw-mr-2"
                  }`}
                  >{#if isMe(message.name)}{$LL.me()}{:else}{message.name}{/if}</span
                >
                <span class="tw-text-xxxs"
                  >{message.time.toLocaleTimeString($locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}</span
                >
              </div>
              <div
                class={`tw-rounded-lg tw-bg-dark tw-text-xs tw-px-3 tw-py-2 ${
                  isMe(message.name) ? "tw-text-right" : "tw-text-left"
                }`}
              >
                <p class="tw-mb-0 tw-whitespace-pre-line">{message.body}</p>
              </div>
            </div>
          </div>
          {#if message.error}
            <div
              class="wa-error-message"
              on:mouseleave={() =>
                document
                  .getElementById(`error_${message.id}`)
                  ?.classList.add("tw-invisible")}
            >
              <div
                class={`tw-text-pop-red tw-ml-1 tw-flex ${
                  needHideHeader(message.name, message.time, i) ? "" : "tw-mt-4"
                }`}
                on:click={() =>
                  document
                    .getElementById(`error_${message.id}`)
                    ?.classList.remove("tw-invisible")}
              >
                <AlertCircleIcon size="16" />
              </div>
              <div
                id={`error_${message.id}`}
                class={`wa-dropdown-menu tw-invisible`}
              >
                <span
                  class="wa-dropdown-item"
                  on:click={() =>
                    mucRoom.sendBack(message.id) &&
                    document
                      .getElementById(`error_${message.id}`)
                      ?.classList.add("tw-invisible")}
                >
                  <RefreshCwIcon size="13" class="tw-mr-1" />
                  {$LL.sendBack()}
                </span>
                <span
                  class="wa-dropdown-item tw-text-pop-red"
                  on:click={() =>
                    mucRoom.deleteMessage(message.id) &&
                    document
                      .getElementById(`error_${message.id}`)
                      ?.classList.add("tw-invisible")}
                >
                  <Trash2Icon size="13" class="tw-mr-1" />
                  {$LL.delete()}
                </span>
              </div>
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/each}
  {#each [...$usersStore].filter(([, userFilter]) => userFilter.chatState === ChatStates.COMPOSING) as [nb, user]}
    <div class={`tw-mt-2`} id={`user-line-${nb}`}>
      <div class={`tw-flex tw-justify-start`}>
        <div
          class={`tw-mt-4 tw-relative wa-avatar-mini tw-mr-2 tw-z-10`}
          style={`background-color: ${getColor(user.name)}`}
          in:fade={{ duration: 100 }}
          out:fade={{ delay: 200, duration: 100 }}
        >
          <div class="wa-container">
            <img class="tw-w-full" src={getWoka(user.name)} alt="Avatar" />
          </div>
        </div>
        <div
          class={`tw-w-3/4`}
          in:fly={{ x: -10, delay: 100, duration: 200 }}
          out:fly={{ x: -10, duration: 200 }}
        >
          <div class="tw-w-fit">
            <div
              style={`border-bottom-color:${getColor(user.name)}`}
              class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-pb-1`}
            >
              <span class="tw-text-lighter-purple tw-text-xxs">{user.name}</span
              >
            </div>
            <div class="tw-rounded-lg tw-bg-dark tw-text-xs tw-p-3">
              <!-- loading animation -->
              <div class="loading-group">
                <span class="loading-dot" />
                <span class="loading-dot" />
                <span class="loading-dot" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  {/each}
  {#if $unreads > 0}
    <div class="tw-w-full tw-fixed tw-left-0 tw-bottom-14 tw-animate-bounce tw-cursor-pointer">
      <div
              transition:fly={{ y: 10, duration: 200 }}
              style="margin: auto"
              class="tw-bg-lighter-purple tw-rounded-xl tw-h-5 tw-px-2 tw-w-fit tw-text-xs tw-flex tw-justify-center tw-items-center tw-shadow-grey"
              role="button"
              on:click={scrollDownAndRead}>
        <ArrowDownIcon size="14" />
        <p class="tw-m-0">{$unreads} {$unreads > 1?'nouveaux messages':'nouveau message'}</p>
      </div>
    </div>
  {/if}
</div>

<style lang="scss">
  .messageList {
    display: flex;
    justify-content: flex-end;
    overflow: scroll;
    height: auto;
    min-height: 100vh;
  }
  .wa-error-message {
    position: relative;
    .wa-dropdown-menu {
      right: auto;
      margin-left: -150px;
      margin-top: -42px;
      &::after {
        width: 0;
        height: 0;
        border-top: 6px solid transparent;
        border-bottom: 6px solid transparent;

        border-left: 4px solid #4d4b67;
        content: "";
        position: absolute;
        margin-left: 100%;
        margin-top: calc(20% - 3px);
      }
    }
  }
</style>
