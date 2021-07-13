<script lang="ts">
    import { fly } from 'svelte/transition';
    import { chatMessagesStore, chatVisibilityStore } from "../../Stores/ChatStore";
    import ChatMessageForm from './ChatMessageForm.svelte';
    import ChatElement from './ChatElement.svelte';
    import { afterUpdate, beforeUpdate } from "svelte";
    
    let listDom: HTMLElement;
    let autoscroll: boolean;

    beforeUpdate(() => {
        autoscroll = listDom && (listDom.offsetHeight + listDom.scrollTop) > (listDom.scrollHeight - 20);
    });

    afterUpdate(() => {
        if (autoscroll) listDom.scrollTo(0, listDom.scrollHeight);
    });

    function closeChat() {
        chatVisibilityStore.set(false);
    }
    function onKeyDown(e:KeyboardEvent) {
        if (e.key === 'Escape') {
            closeChat();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown}/>


<aside class="chatWindow" transition:fly="{{ x: -1000, duration: 500 }}">
    <section class="chatWindowTitle">
        <h1>Your chat history <span class="float-right" on:click={closeChat}>&times</span></h1>

    </section>
    <section class="messagesList" bind:this={listDom}>
        <ul>
        {#each $chatMessagesStore as message, i}
            <li><ChatElement message={message} line={i}></ChatElement></li>
        {/each} 
        </ul>
    </section>
    <section class="messageForm">
        <ChatMessageForm></ChatMessageForm>
    </section>
</aside>

<style lang="scss">
    h1 {
      font-family: 'Whiteney';

      span.float-right {
        font-size: 30px;
        line-height: 25px;
        font-weight: bold;
        float: right;
        cursor: pointer;
      }
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
      background: rgb(5, 31, 51, 0.9);
      color: whitesmoke;
      display: flex;
      flex-direction: column;

      padding: 10px;
      
      border-bottom-right-radius: 16px;
      border-top-right-radius: 16px;
      
      h1 {
        background-color: #5f5f5f;
        border-radius: 8px;
        padding: 2px;
      }
      
      .chatWindowTitle {
        flex: 0 100px;
      }
      .messagesList {
        overflow-y: auto;
        flex: auto;

        ul {
          list-style-type: none;
          padding-left: 0;
        }
      }
      .messageForm {
        flex: 0 70px;
        padding-top: 20px;
      }
    }
</style>