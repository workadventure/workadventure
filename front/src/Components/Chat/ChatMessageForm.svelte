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
    <button type="submit">
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
            border-bottom-left-radius: 4px;
            border-top-left-radius: 4px;
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
</style>
