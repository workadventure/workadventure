<script lang="ts">
  import { fade, fly } from "svelte/transition";
  import {
    ChatStates,
    defaultColor,
    defaultWoka,
    MessagesStore,
    MucRoom, User,
  } from "../Xmpp/MucRoom";
  import LL, { locale } from "../i18n/i18n-svelte";
  import { userStore } from "../Stores/LocalUserStore";
  import { mucRoomsStore } from "../Stores/MucRoomsStore";
  import {UserData} from "../Messages/JsonMessages/ChatData";

  export let messagesStore: MessagesStore;
  export let mucRoom: MucRoom;

  let messagesList: HTMLElement;

  let lastDate: Date;

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
    if(userData) {
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
      messagesList.scroll(0, messagesList.scrollHeight);
    }, 100);
  };

  $: usersStore = mucRoom.getPresenceStore();
</script>

<div
  class="tw-flex tw-flex-col tw-flex-auto tw-px-5 tw-overflow-y-scroll tw-pt-14 tw-pb-14 tw-justify-end tw-overflow-y-scroll tw-h-auto tw-min-h-screen"
  bind:this={messagesList}
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
      class={`${
        needHideHeader(message.name, message.time, i) ? "tw-mt-1" : "tw-mt-2"
      }`}
    >
      <div
        class={`tw-flex ${
          isMe(message.name) ? "tw-justify-end" : "tw-justify-start"
        }`}
      >
        <div
          class={`${
            isMe(message.name) || needHideHeader(message.name, message.time, i)
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
            class={`tw-flex tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-1 ${
              needHideHeader(message.name, message.time, i) ? "tw-hidden" : ""
            }`}
          >
            <span class="tw-text-lighter-purple"
              >{#if isMe(message.name)}{$LL.me()}{:else}{message.name}{/if}</span
            >
            <span
              >{message.time.toLocaleTimeString($locale, {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}</span
            >
          </div>
          <div class={`tw-rounded-lg tw-bg-dark tw-text-xs tw-px-3 tw-py-2`}>
            <p class="tw-mb-0 tw-whitespace-pre-line">{message.body}</p>
          </div>
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
</div>

<style lang="scss">
  .messageList {
    display: flex;
    justify-content: flex-end;
    overflow: scroll;
    height: auto;
    min-height: 100vh;
  }
</style>
