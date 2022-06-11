<script lang="ts">
    import { fly } from "svelte/transition";
    import { chatMessagesStore, chatVisibilityStore } from "../../Stores/ChatStore";
    import ChatMessageForm from "./ChatMessageForm.svelte";
    import ChatElement from "./ChatElement.svelte";
    import { afterUpdate, beforeUpdate, onMount } from "svelte";
    import { HtmlUtils } from "../../WebRtc/HtmlUtils";
    import LL from "../../i18n/i18n-svelte";
    import { localUserStore } from "../../Connexion/LocalUserStore";

    let listDom: HTMLElement;
    let chatWindowElement: HTMLElement;
    let handleFormBlur: { blur(): void };
    let autoscroll: boolean;
    let switchValue = true;
    let translationEnabled = localUserStore.hasEnabledTranslation();

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

    function toggleSwitch(e: any) {
        translationEnabled = !translationEnabled;
        // Store the data during the session
        if (translationEnabled) {
            localUserStore.enableTranslation();
        } else {
            localUserStore.disableTranslation();
        }
    }
</script>

<svelte:window on:keydown={onKeyDown} on:click={onClick} />

<aside class="chatWindow" transition:fly={{ x: -1000, duration: 500 }} bind:this={chatWindowElement}>
    <img class="traductor" src="resources/chat/traductor.png" alt="Traductor icon" />
    <p class="close-icon noselect" on:click={closeChat}>&times</p>
    <section class="messagesList" bind:this={listDom}>
        <ul>
            <li><p class="system-text">{$LL.chat.intro()}</p></li>
            {#each $chatMessagesStore as message, i}
                <li><ChatElement bind:translationEnabled {message} line={i} /></li>
            {/each}
        </ul>
    </section>
    <section class="messageForm">
        <div class="transletSwitch" on:click={toggleSwitch}>
            <img src="resources/chat/translation-logo.png" alt="Translation logo" class="translation-logo"/>
            <label class="switch">
                <input type="checkbox" bind:checked={translationEnabled} on:input={toggleSwitch} />
                <span class="slider round" />
            </label>
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

    .traductor {
        position: absolute;
        top: -2.5rem;
        right: 1.4rem;
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
        bottom: 0;
        left: 0;
        height: 100vh;
        width: 30vw;
        min-width: 350px;
        background: rgb(5, 31, 51, 0.9);
        color: whitesmoke;
        display: flex;
        flex-direction: column;
        max-height: 90vh;

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

        .transletSwitch {
            display: flex;
            align-items: center;
            margin-left: 0.5em;
            margin-right: 0.5em;
            border: solid rgb(5, 31, 51, 0.9) 2px;
            border-radius: 40px;
            padding-left: 0.3em;
            padding-right: 0.3em;
        }
        .switch {
            position: relative;
            display: inline-block;
            width: 60px;
            height: 34px;
            margin-left: 0.3em;
            margin-bottom: -0.1em;
        }

        .translation-logo {
            border-radius: 20px;
            width: 29px;
            height: 29px;
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
            -webkit-transition: 0.4s;
            transition: 0.4s;
        }

        .slider:before {
            position: absolute;
            content: "";
            height: 26px;
            width: 26px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            -webkit-transition: 0.4s;
            transition: 0.4s;
        }

        input:checked + .slider {
            background-color: #2196f3;
        }

        input:focus + .slider {
            box-shadow: 0 0 1px #2196f3;
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
