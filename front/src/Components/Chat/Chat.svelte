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

<aside class="chatWindow" transition:fly={{ x: -1000, duration: 500 }} bind:this={chatWindowElement}>
    <p class="close-icon noselect" on:click={closeChat}>&times</p>
    <section class="messagesList" bind:this={listDom}>
        <ul>
            <li><p class="system-text">{$LL.chat.intro()}</p></li>
            {#each $chatMessagesStore as message, i}
                <li><ChatElement {message} line={i} /></li>
            {/each}
        </ul>
    </section>
    <section  class="messageForm">
        <div class="transletSwwitch">
            <label class="switch">
                <input type="checkbox">
                <span class="slider round"></span>
              </label>
            <img width=25 height=25 src="data:image/png;base64,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" alt="translate" />
        </div>
        <ChatMessageForm bind:handleForm={handleFormBlur} />
    </section>
</aside>

<style lang="scss">
    p.close-icon {
        position: absolute;
        padding: 4px;
        right: 12px;
        font-size: 30px;
        line-height: 25px;
        cursor: pointer;
    }
    .transletSwwitch{
        display: flex;
        align-items: center;
        margin-right: 24px;
    }

    p.system-text {
        border-radius: 8px;
        margin-bottom: 10px;
        padding: 6px;
        overflow-wrap: break-word;
        max-width: 100%;
        background: gray;
        display: inline-block;
    }

    aside.chatWindow {
        z-index: 1000;
        pointer-events: auto;
        position: absolute;
        top: 0;
        left: 0;
        height: 100vh;
        width: 30vw;
        min-width: 350px;
        background: rgb(5, 31, 51, 0.9);
        color: whitesmoke;
        display: flex;
        flex-direction: column;

        padding: 10px;

        border-bottom-right-radius: 16px;
        border-top-right-radius: 16px;

        .messagesList {
            margin-top: 35px;
            overflow-y: auto;
            flex: auto;

            ul {
                list-style-type: none;
                padding-left: 0;
            }
        }
        .messageForm {
            display: flex;
            flex: 0 70px;
            padding-top: 15px;
        }
        .switch {
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;
}

.switch input { 
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #ccc;
  -webkit-transition: .4s;
  transition: .4s;
}

.slider:before {
  position: absolute;
  content: "";
  height: 26px;
  width: 26px;
  left: 4px;
  bottom: 4px;
  background-color: white;
  -webkit-transition: .4s;
  transition: .4s;
}

input:checked + .slider {
  background-color: #2196F3;
}

input:focus + .slider {
  box-shadow: 0 0 1px #2196F3;
}

input:checked + .slider:before {
  -webkit-transform: translateX(26px);
  -ms-transform: translateX(26px);
  transform: translateX(26px);
}

/* Rounded sliders */
.slider.round {
  border-radius: 34px;
}

.slider.round:before {
  border-radius: 50%;
}
    }
</style>
