<script lang="ts">
    import LL from "../../i18n/i18n-svelte";
    import { chatMessagesStore, chatInputFocusStore } from "../../Stores/ChatStore";

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
        chatMessagesStore.addPersonnalMessage(newMessageText);
        newMessageText = "";
    }
</script>

<form on:submit|preventDefault={saveMessage}>
    <input
        type="text"
        bind:value={newMessageText}
        placeholder={$LL.chat.enter()}
        on:focus={onFocus}
        on:blur={onBlur}
        bind:this={inputElement}
    />
    <button type="submit">Send</button>
</form>

<style lang="scss">
    form {
        border: 1px solid #888;
        border-radius: 2px;
        display: flex;
        background: rgba(16, 40, 63, 0.9);
        line-height: 32px;

        input {
            flex: auto;
            border: none;
            color: white;
            font-size: 14px;
            background-color: inherit;
            padding-left: 6px;
            min-width: 0; //Needed so that the input doesn't overflow the container in firefox
            outline: none;
            &:hover {
                cursor: text;
            }
            &::placeholder {
                padding-left: 6px;
                color: #c0bebe;
                font-style: italic;
                font-size: 14px;
                opacity: 1; /* Firefox */
            }
        }

        button {
            background: rgb(62, 148, 234);
            border: none;
            color: white;
            border-left: 1px solid #888;
            font-size: 16px;
        }
    }
</style>
