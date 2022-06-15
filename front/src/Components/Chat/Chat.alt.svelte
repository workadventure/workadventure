<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatMessagesStore, chatVisibilityStore } from "../../../chat/src/Stores/ChatStore";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import ChatElement from "./ChatElement.svelte";
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    // import LL from "../../i18n/i18n-svelte";

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
    <section class="tw-p-0" bind:this={listDom}>
        <div class="tw-p-5">
            <button on:click={closeChat} type="button" class="tw-inline-flex tw-h-auto tw-text-sm tw-items-center tw-bg-transparent tw-border tw-border-solid tw-border-light-blue tw-text-light-blue tw-rounded tw-space-x-2 tw-py-1 tw-px-3">
                <img src="/static/images/arrow-left-blue.png" height="9" alt=""/>
                <span> Back to chat menu </span>
            </button>
            <!-- <li><p class="">{$LL.chat.intro()}</p></li> -->
            <!-- <div class="tw-flex tw-px-5 tw-py-4 tw-border-b-lighter-purple tw-border-0 tw-border-b tw-border-solid">
                <p class="tw-mb-0 tw-text-sm tw-text-lighter-purple">Back to chat menu</p>
                <div>
                    <button class="tw-bg-transparent tw-text-lighter-purple" on:click={closeChat}>&times</button>
                </div>
            </div> -->
            <div class="tw-my-10">
                {#each $chatMessagesStore as message, i}
                    <div><ChatElement {message} line={i} />
                    </div>
                {/each}
            </div>
        </div>
    </section>
    <section class="messageForm">
        <ChatMessageForm bind:handleForm={handleFormBlur} />
    </section>
</aside>

<style lang="scss">
    aside.chatWindow {
        z-index: 1000;
        pointer-events: auto;
        position: absolute;
        top: 0;
        left: 0;
        height: 100vh;
        width: 30vw;
        min-width: 350px;
        background: rgba(#1B1B29, 0.9);
        color: whitesmoke;
        display: flex;
        flex-direction: column;

        // padding: 10px;

        border-bottom-right-radius: 16px;
        border-top-right-radius: 16px;

        .messageForm {
            flex: 0 70px;
            padding-top: 15px;
        }
    }
</style>
