<script lang="ts">
    import LL from "../../i18n/i18n-svelte";
    import {
        chatMessagesStore,
        chatInputFocusStore,
        writingStatusMessageStore,
        ChatMessageTypes,
        _newChatMessageWritingStatusSubject,
    } from "../../Stores/ChatStore";

    export const handleForm = {
        blur() {
            inputElement.blur();
        },
    };
    let inputElement: HTMLElement;
    let newMessageText = "";

    function onFocus() {
        chatInputFocusStore.set(true);
    }
    function onBlur() {
        chatInputFocusStore.set(false);
    }

    function saveMessage() {
        if (!newMessageText) return;

        //send message into the input
        chatMessagesStore.addPersonnalMessage(newMessageText);
        newMessageText = "";

        //send message to stop writing
        _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userStopWriting);
    }
    function writing() {
        if (newMessageText != undefined && newMessageText !== "") {
            _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userWriting);
        } else {
            _newChatMessageWritingStatusSubject.next(ChatMessageTypes.userStopWriting);
        }
    }
</script>

{#if $writingStatusMessageStore.size > 0}
    <div class="writings">
        {#each [...$writingStatusMessageStore] as author}
            <span class="writing">{author.name} {$LL.chat.typing()} </span>
        {/each}
    </div>
{/if}

<form on:submit|preventDefault={saveMessage} class="tw-h-10">
    <input
        type="text"
        class="tw-h-full tw-rounded-none"
        bind:value={newMessageText}
        placeholder={$LL.chat.enter()}
        on:input={writing}
        on:focus={onFocus}
        on:blur={onBlur}
        bind:this={inputElement}
    />
    <button type="submit" class="tw-h-full tw-m-0 tw-rounded-l-none">
        <img src="/static/images/send.png" alt="Send" width="20" />
    </button>
</form>

<style lang="scss">
    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;

        input {
            flex: auto;
            background-color: #254560;
            color: white;
            //border-bottom-left-radius: 4px;
            //border-top-left-radius: 4px;
            border-bottom-right-radius: 0;
            border-top-right-radius: 0;
            border: none;
            font-size: 22px;
            font-family: Lato;
            padding-left: 6px;
            min-width: 0; //Needed so that the input doesn't overflow the container in firefox
            outline: none;
        }

        button {
            background-color: #254560;
            border-bottom-right-radius: 4px;
            border-top-right-radius: 4px;
            border: none;
            border-left: solid white 1px;
            font-size: 16px;
        }
    }
    div.writings {
        overflow: hidden;
        max-width: 100%;
        padding: 5px;

        .writing {
            font-style: italic;
            font-size: 10px;
            opacity: 0.8;
            margin-left: 2px;
            padding: 5px;
            background-color: #254560;
            border-radius: 4px;
        }
    }
</style>
