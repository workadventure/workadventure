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
    <section class="messageForm">
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
            flex: 0 70px;
            padding-top: 15px;
        }
    }
</style>
