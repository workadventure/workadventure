<script lang="ts">
  import { fly } from "svelte/transition";
  import {
    SendIcon,
    SmileIcon,
    PaperclipIcon,
    LoaderIcon,
    Trash2Icon,
    CheckIcon,
    AlertCircleIcon,
  } from "svelte-feather-icons";
  import { ChatStates, MucRoom, User } from "../Xmpp/MucRoom";
  import LL, { locale } from "../i18n/i18n-svelte";
  import { createEventDispatcher, onMount } from "svelte";
  import { EmojiButton } from "@joeattardi/emoji-button";
  import {
    selectedMessageToReply,
    filesUploadStore,
  } from "../Stores/ChatStore";
  import { UserData } from "../Messages/JsonMessages/ChatData";
  import { userStore } from "../Stores/LocalUserStore";
  import { mucRoomsStore } from "../Stores/MucRoomsStore";
  import {
    fileMessageManager,
    UploadedFile,
    uploadingState,
  } from "../Services/FileMessageManager";

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
    if (
      $filesUploadStore.size === 0 &&
      (!newMessageText || newMessageText.replace(/\s/g, "").length === 0)
    )
      return;
    if ($selectedMessageToReply) {
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
    if (
      !$selectedMessageToReply ||
      !newMessageText ||
      newMessageText.replace(/\s/g, "").length === 0
    )
      return;
    mucRoom.updateComposingState(ChatStates.PAUSED);
    mucRoom.sendMessage(newMessageText, $selectedMessageToReply);
    selectedMessageToReply.set(null);
    newMessageText = "";
    dispatch("scrollDown");
    return false;
  }

  function openEmoji() {
    picker.showPicker(emojiContainer);
    emojiOpened = true;
  }

  function handleInputFile(event: Event) {
    const files = (<HTMLInputElement>event.target).files;
    if (!files || files.length === 0) {
      console.info("No files uploaded");
      filesUploadStore.set(new Map());
      return;
    }
    fileMessageManager.sendFiles(files).catch(() => {});
  }

  function handlerDeleteUploadedFile(file: File | UploadedFile) {
    if (file instanceof File) {
      //TODO manage promise listener to delete file
    } else {
      fileMessageManager.deleteFile(file).catch(() => {});
    }
    filesUploadStore.update((list) => {
      list.delete(file.name);
      return list;
    });
  }

  function resend() {
    const files = (document.getElementById("file") as HTMLInputElement).files;
    if (!files) {
      console.info("No files uploaded");
      filesUploadStore.set(new Map());
      return;
    }
    fileMessageManager.sendFiles(files).catch(() => {});
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
    <div
      class="replyMessage"
      on:click={() => selectedMessageToReply.set(null)}
      transition:fly={{
        x: isMe($selectedMessageToReply.name) ? 10 : -10,
        delay: 100,
        duration: 200,
      }}
    >
      <div
        style={`border-bottom-color:${getColor($selectedMessageToReply.name)}`}
        class={`tw-flex tw-items-end tw-justify-between tw-mx-2 tw-border-0 tw-border-b tw-border-solid tw-text-light-purple-alt tw-text-xxs tw-pb-0.5 ${
          isMe($selectedMessageToReply.name)
            ? "tw-flex-row-reverse"
            : "tw-flex-row"
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
        </p>
      </div>
    </div>
  {/if}

  <div class="emote-menu-container">
    <div class="emote-menu" id="emote-picker" bind:this={emojiContainer} />
  </div>

  <form on:submit|preventDefault={sendMessage}>
    <div class="tw-w-full tw-p-2">
      {#each [...$filesUploadStore.values()] as fileUploaded}
        <div
          class="upload-file tw-flex tw-flex-wrap tw-bg-dark-blue/95 tw-rounded-3xl tw-text-xxs tw-justify-between tw-items-center tw-px-3 tw-mb-1"
        >
          {#if fileUploaded.errorMessage != undefined}
            <div
              class="error-hover tw-flex tw-flex-wrap tw-bg-dark-blue/95 tw-rounded-3xl tw-text-xxs tw-justify-between tw-items-center tw-px-3 tw-mb-1"
            >
              <p class="tw-m-0">{fileUploaded.errorMessage}</p>
            </div>
          {/if}
          <div
            style="max-width: 92%; display: flex; flex-wrap: nowrap;"
            class="tw-flex tw-flex-wrap tw-text-xxs tw-items-center"
          >
            {#if fileUploaded.uploadState === uploadingState.finish}
              <CheckIcon size="14" class="tw-text-pop-green" />
            {:else if fileUploaded.uploadState === uploadingState.error}
              <div
                class="alert-upload tw-cursor-pointer"
                on:click|preventDefault|stopPropagation={() => {
                  resend();
                }}
              >
                <AlertCircleIcon size="14" />
              </div>
            {:else}
              <LoaderIcon size="14" class="tw-animate-spin" />
            {/if}
            <span
              class="tw-ml-1 tw-max-w-full tw-text-ellipsis tw-overflow-hidden tw-whitespace-nowrap"
            >
              {fileUploaded.name}
            </span>
          </div>
          <button
            on:click|preventDefault|stopPropagation={() => {
              handlerDeleteUploadedFile(fileUploaded);
            }}
            class="tw-pr-0 tw-mr-0"
          >
            <Trash2Icon size="14" />
          </button>
        </div>
      {/each}
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
        <input
          type="file"
          id="file"
          name="file"
          class="tw-hidden"
          on:input={handleInputFile}
          multiple
        />
        <label for="file" class="tw-mb-0 tw-cursor-pointer"
          ><PaperclipIcon size="17" /></label
        >
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
  .replyMessage {
    padding: 0 20px;
    margin: 0;
    position: relative;

    &::after {
      content: "x";
      width: 20px;
      height: 20px;
      cursor: pointer;
      color: white;
      font-size: 12px;
      position: absolute;
      top: 0;
      right: 4px;
      border: solid 1px white;
      text-align: center;
      border-radius: 99%;
    }

    .message {
      opacity: 0.5;
    }
  }

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

    .alert-upload {
      --tw-text-opacity: 1;
      color: rgb(255 71 90 / var(--tw-text-opacity));
    }
    .upload-file {
      position: relative;
      display: flex;
      flex-wrap: nowrap;
      .error-hover {
        display: none;
        position: absolute;
        color: red;
        left: 0;
        top: -32px;
        width: 100%;
        min-height: 30px;
      }
      &:hover {
        .error-hover {
          display: flex;
        }
      }
    }
  }
</style>
