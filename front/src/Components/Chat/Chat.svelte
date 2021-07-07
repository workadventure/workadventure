<script lang="ts">
    import { fly } from 'svelte/transition';
    import {chatMessagesStore, chatVisibilityStore} from "../../Stores/ChatStore";
    import ChatMessageForm from './ChatMessageForm.svelte';
    import ChatElement from './ChatElement.svelte';
    import {onMount} from "svelte";
    
    let listDom: HTMLElement;

    onMount(() => {
        listDom.addEventListener('onscroll', function(e: Event) {
            console.log(e);
            // Active list item is top-most fully-visible item
            //const visibleListItems = Array.from(document.getElementsByClassName('list-item')).map(inView.is);
            // Array.indexOf() will give us the first one in list, so the current active item
            //const topMostVisible = visibleListItems.indexOf(true);
        });
    })
    
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
        <h3>Here is your chat history <button on:click={closeChat}>❌</button></h3>

    </section>
    <section class="messagesList">
        <ul bind:this={listDom}>
        {#each $chatMessagesStore as message}
            <li><ChatElement message={message}></ChatElement></li>
        {/each} 
        </ul>
    </section>
    <section class="messageForm">
        <ChatMessageForm></ChatMessageForm>
    </section>
</aside>

<style lang="scss">
    h3 {
      font-family: 'Whiteney';
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
      background: #051f33;
      color: whitesmoke;
      display: flex;
      flex-direction: column;

      padding: 10px;
      
      border-bottom-right-radius: 16px;
      border-top-right-radius: 16px;
      
      h3 {
        background-color: #5f5f5f;
        border-radius: 8px;
        padding: 2px;
        font-size: 100%;
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