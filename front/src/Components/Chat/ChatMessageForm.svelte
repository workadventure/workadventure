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

    async function saveMessage() {
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
    <button type="submit" style="background-color: #FFF">
        <img src="/static/images/send_msg.png" alt="Send" width="20" />
    </button>
</form>

<style lang="scss">
    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;
        width: 100%;

        ::placeholder {
            color: #18314b;
        }
        input {
            flex: auto;
            background-color: #FFF;
            color: #18314b;
            border-bottom-left-radius: 4px;
            border-top-left-radius: 4px;
            border: none;
            font-size: 1rem;
            font-family: Lato;
            padding: 0.5rem 0.5rem .5rem .5rem;
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
