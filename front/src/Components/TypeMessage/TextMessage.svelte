<script lang="ts">
  import { fly, fade } from "svelte/transition";
  import { QuillDeltaToHtmlConverter } from "quill-delta-to-html";
  import type { Message } from "../../Stores/TypeMessageStore/MessageStore";
  import { textMessageStore } from "../../Stores/TypeMessageStore/TextMessageStore";

  export let message: Message;

  const content = JSON.parse(message.text);
  const converter = new QuillDeltaToHtmlConverter(content.ops, { inlineStyles: true });

  function closeTextMessage() {
    textMessageStore.clearMessageById(message.id);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === "Escape") {
      closeTextMessage();
    }
  }
</script>

<svelte:window on:keydown={onKeyDown} />

<div
  class="main-text-message tw-bg-dark-purple/95 tw-rounded tw-absolute tw-flex tw-w-3/5 tw-m-auto tw-py-3 tw-pl-5 tw-pr-2 tw-max-h-1/4 tw-left-0 tw-right-0"
  in:fly={{ x: -1000, duration: 500, delay: 250 }}
  out:fade={{ duration: 150 }}
>
  <div class="content-text-message">
    {@html converter.convert()}
  </div>
  <button type="button" class="btn close" on:click|preventDefault={closeTextMessage}
  >&times
  </button>

</div>

<style lang="scss">
  div.main-text-message {
    //display: flex;
    //flex-direction: column;
    //position: absolute;
    //
    //max-height: 25%;
    //margin-right: auto;
    //margin-left: auto;
    //top: 6%;
    //left: 0;
    //right: 0;
    //padding-bottom: 0;
    //z-index: 240;

    pointer-events: auto;

    div.content-text-message {
      flex: 1 1 auto;
      max-height: calc(100% - 50px);
      color: whitesmoke;

      overflow: auto;
    }
  }
</style>
