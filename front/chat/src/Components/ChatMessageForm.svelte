<script lang="ts">
  import { SendIcon, SmileIcon } from "svelte-feather-icons";
  import { ChatStates, MucRoom } from "../Xmpp/MucRoom";
  import LL from "../i18n/i18n-svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import { EmojiButton } from "@joeattardi/emoji-button";

  export let mucRoom: MucRoom;

  const dispatch = createEventDispatcher();

  let emojiContainer: HTMLElement;
  let picker: EmojiButton;
  let textarea: HTMLTextAreaElement;

  let emojiOpened = false;
  let newMessageText = "";

  function onFocus() {}
  function onBlur() {}

  function adjustHeight() {
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  function sendMessage() {
    if (!newMessageText || newMessageText.replace(/\s/g, "").length === 0)
      return;
    mucRoom.updateComposingState(ChatStates.PAUSED);
    mucRoom.sendMessage(newMessageText);
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
