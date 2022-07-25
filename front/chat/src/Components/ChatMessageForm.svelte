<script lang="ts">
  import { fly } from "svelte/transition";
  import { SendIcon, SmileIcon } from "svelte-feather-icons";
  import { ChatStates, MucRoom, User } from "../Xmpp/MucRoom";
  import LL, { locale } from "../i18n/i18n-svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import { EmojiButton } from "@joeattardi/emoji-button";
  import { selectedMessageToReply } from "../Stores/ChatStore";
  import { UserData } from "../Messages/JsonMessages/ChatData";
  import { userStore } from "../Stores/LocalUserStore";
  import { mucRoomsStore } from "../Stores/MucRoomsStore";

  export let mucRoom: MucRoom;

  const dispatch = createEventDispatcher();

  let emojiContainer: HTMLElement;
  let picker: EmojiButton;
  let textarea: HTMLTextAreaElement;

  let emojiOpened = false;
  let newMessageText = "";

  export const defaultColor = "#626262";

  $: presenseStore = mucRoomsStore.getDefaultRoom().getPresenceStore();

  function onFocus() {}
  function onBlur() {}

  function adjustHeight() {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  function sendMessage() {
    if (!newMessageText || newMessageText.replace(/\s/g, "").length === 0)
      return;
    if($selectedMessageToReply){
      sendReplyMessage();
      return false;
    }
    mucRoom.updateComposingState(ChatStates.PAUSED);
    mucRoom.sendMessage(newMessageText);
    newMessageText = "";
    dispatch("scrollDown");
    return false;
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

  function getColor(name: string) {
    const user = findUserInDefault(name);
    if (user) {
      return user.color;
    } else {
      return defaultColor;
    }
  }

  function sendReplyMessage() {
    if (!$selectedMessageToReply || !newMessageText || newMessageText.replace(/\s/g, "").length === 0)
      return;
    mucRoom.updateComposingState(ChatStates.PAUSED);
    mucRoom.replyMessage(newMessageText, $selectedMessageToReply);
    selectedMessageToReply.set(null);
    newMessageText = "";
    dispatch("scrollDown");
    return false;
  }

  function openEmoji() {
    picker.showPicker(emojiContainer);
    emojiOpened = true;
  }

  onMount(() => {
    picker = new EmojiButton({
      styleProperties: {
        "--font": "Press Start 2P",
        "--background-color": "#23222c",
        "--text-color": "#ffffff",
        "--secondary-text-color": "#ffffff",
        "--category-button-color": "#ffffff",
        "--category-button-active-color": "#56eaff",
      },
      position: "bottom",
      emojisPerRow: 5,
      autoFocusSearch: false,
      style: "twemoji",
      showPreview: false,
      i18n: {
        search: $LL.emoji.search(),
        categories: {
          recents: $LL.emoji.categories.recents(),
          smileys: $LL.emoji.categories.smileys(),
          people: $LL.emoji.categories.people(),
          animals: $LL.emoji.categories.animals(),
          food: $LL.emoji.categories.food(),
          activities: $LL.emoji.categories.activities(),
          travel: $LL.emoji.categories.travel(),
          objects: $LL.emoji.categories.objects(),
          symbols: $LL.emoji.categories.symbols(),
          flags: $LL.emoji.categories.flags(),
          custom: $LL.emoji.categories.custom(),
        },
        notFound: $LL.emoji.notFound(),
      },
    });

    picker.on("emoji", ({ emoji }) => {
      newMessageText += emoji;
    });
    picker.on("hidden", () => {
      emojiOpened = false;
    });
  });
</script>

<div class="wa-message-form">

  {#if $selectedMessageToReply}
    <div class="reply-message">
      <div
        style="max-width: 75%"
        transition:fly={{
          x: isMe($selectedMessageToReply.name) ? 10 : -10,
          delay: 100,
          duration: 200,
        }}
      >
        <div
          style={`border-bottom-color:${getColor($selectedMessageToReply.name)}`}
          class={`tw-flex tw-items-end tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-0.5 ${
            isMe($selectedMessageToReply.name) ? "tw-flex-row-reverse" : "tw-flex-row"
          }`}
        >
          <span
            class={`tw-text-lighter-purple ${
              isMe($selectedMessageToReply.name) ? "tw-ml-2" : "tw-mr-2"
            }`}
            >{#if isMe($selectedMessageToReply.name)}{$LL.me()}{:else}{$selectedMessageToReply.name}{/if}</span
          >
          <span class="tw-text-xxxs"
            >{$selectedMessageToReply.time.toLocaleTimeString($locale, {
              hour: "2-digit",
              minute: "2-digit",
            })}</span
          >
        </div>
        <div
          class="message tw-rounded-lg tw-bg-dark tw-text-xs tw-px-3 tw-py-2 tw-text-left"
        >
          <p class="tw-mb-0 tw-whitespace-pre-line tw-break-words">
            {$selectedMessageToReply.body}
        </div>
      </div>
    </div>
  {/if}

  <div class="emote-menu-container">
    <div class="emote-menu" id="emote-picker" bind:this={emojiContainer} />
  </div>

  <form on:submit|preventDefault={sendMessage}>
    <div class="tw-w-full tw-p-2">
      <div class="tw-flex tw-items-center tw-relative">
        <textarea
          type="text"
          bind:this={textarea}
          bind:value={newMessageText}
          placeholder={$LL.enterText()}
          on:focus={onFocus}
          on:blur={onBlur}
          on:keydown={(key) => {
            if (
              (key.key === "Enter" && key.shiftKey) ||
              ["Backspace", "Delete"].includes(key.key)
            ) {
              setTimeout(() => adjustHeight(), 10);
            }
            if (key.key === "Enter" && !key.shiftKey) {
              sendMessage();
              setTimeout(() => (newMessageText = ""), 10);
              return false;
            }
            return true;
          }}
          on:keypress={() => {
            adjustHeight();
            mucRoom.updateComposingState(ChatStates.COMPOSING);
            return true;
          }}
          rows="1"
          style="margin-bottom: 0;"
        />

        <button
          class={`tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 ${
            emojiOpened ? "tw-text-light-blue" : ""
          }`}
          on:click|preventDefault|stopPropagation={openEmoji}
        >
          <SmileIcon size="17" />
        </button>

        <button
          type="submit"
          class="tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 tw-text-light-blue"
          on:click={sendMessage}
        >
          <SendIcon size="17" />
        </button>
      </div>
    </div>
  </form>
</div>

<style lang="scss">
  form {
    display: flex;
    padding-left: 4px;
    padding-right: 4px;

    // button {
    //     background-color: #254560;
    //     border-bottom-right-radius: 4px;
    //     border-top-right-radius: 4px;
    //     border: none;
    //     border-left: solid white 1px;
    //     font-size: 16px;
    // }
  }
</style>
