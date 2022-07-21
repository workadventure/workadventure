<script lang="ts">
  import { SendIcon } from "svelte-feather-icons";
  import { ChatStates, MucRoom } from "../Xmpp/MucRoom";
  import LL from "../i18n/i18n-svelte";
  import {createEventDispatcher} from "svelte";

  export let mucRoom: MucRoom;

  const dispatch = createEventDispatcher();

  let textarea: HTMLTextAreaElement;

  let newMessageText = "";

  function onFocus() {}
  function onBlur() {}

  function adjustHeight(){
    textarea.style.height = "auto";
    textarea.style.height = textarea.scrollHeight + "px";
  }

  function sendMessage() {
    if (!newMessageText || newMessageText.replace(/\s/g, "").length === 0) return;
    mucRoom.updateComposingState(ChatStates.PAUSED);
    mucRoom.sendMessage(newMessageText);
    newMessageText = '';
    dispatch('scrollDown');
    return false;
  }
</script>
<div class="wa-message-form">
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
            if((key.keyCode === 13 && key.shiftKey) || [8,46].includes(key.keyCode)){
              setTimeout(() => adjustHeight(), 10);
            }
            if(key.keyCode === 13 && !key.shiftKey){
              sendMessage();
              setTimeout(() => newMessageText = '', 10);
              return false;
            }
          }}
          on:keypress={() => {
            adjustHeight();
            mucRoom.updateComposingState(ChatStates.COMPOSING);
            return true;
          }}
          rows="1"
          style="margin-bottom: 0;"
        ></textarea>
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
