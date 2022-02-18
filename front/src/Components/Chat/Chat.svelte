<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatMessagesStore, chatVisibilityStore } from "../../Stores/ChatStore";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import ChatElement from "./ChatElement.svelte";
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import LL from "../../i18n/i18n-svelte";

    let listDom: HTMLElement;
    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };
    let autoscroll: boolean;

    beforeUpdate(() => {
        autoscroll = listDom && listDom.offsetHeight + listDom.scrollTop > listDom.scrollHeight - 20;
    });

    onMount(() => {
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

    function closeChat() {
        chatVisibilityStore.set(false);
    }
    function onKeyDown(e: KeyboardEvent) {
        if (e.key === "Escape") {
            closeChat();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" transition:fly="{{ x: -1000, duration: 500 }}" bind:this={chatWindowElement}>
    <button type="button" class="nes-btn is-error close" on:click={closeChat}>&times</button>
    <p>{$LL.chat.intro()}</p>
    <section class="messagesList" bind:this={listDom}>
        <ul>
        {#each $chatMessagesStore as message, i}
            <li><ChatElement message={message} line={i}></ChatElement></li>
        {/each} 
        </ul>
    </section>
    <section class="messageForm">
        <ChatMessageForm bind:handleForm={handleFormBlur} />
    </section>
</aside>

<style lang="scss">
    .nes-btn.is-error.close {
      position: absolute;
      top: 0;
      right: 0;
    }

    aside.chatWindow {
      z-index:100;
      pointer-events: auto;
      position: absolute;
      top: 0;
      left: 0;
      height: 100vh;
      width:30vw;
      min-width: 350px;
      background: rgba(8, 19, 30, 0.9);
      color: white;
      display: flex;
      flex-direction: column;
      padding: 10px;

      // Scroll bar design
      /* width */
      ::-webkit-scrollbar {
        width: 12px;
      }
      /* Track */
      ::-webkit-scrollbar-track {
        background: #1E2427;
        border-radius: 2px;
      }
      /* Handle */
      ::-webkit-scrollbar-thumb {
        background: #404547;
        border-radius: 2px;
      }

      .messagesList {
        margin-top: 50px;
        overflow-y: auto;
        flex: auto;

        ul {
          list-style-type: none;
          padding-left: 0;
        }
      }
      .messageForm {
        flex: 0 70px;
        padding-top: 30px;
      }
    }
</style>
