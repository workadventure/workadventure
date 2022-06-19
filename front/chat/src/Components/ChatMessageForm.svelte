<script lang="ts">
    import { SendIcon } from "svelte-feather-icons";
    import { chatMessagesStore, chatInputFocusStore } from "../Stores/ChatStore";

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
    <div class="tw-w-full tw-p-2">
        <div
            class="tw-flex tw-items-center tw-relative tw-border tw-border-solid tw-rounded-full tw-px-3 tw-py-1 tw-bg-dark"
        >
            <textarea
                type="text"
                bind:value={newMessageText}
                class="tw-flex-1 tw-text-sm tw-ml-2 tw-bg-transparent tw-outline-0 focus:tw-ring-0 tw-mb-0 tw-min-h-[35px] tw-border-0 tw-resize-none placeholder:tw-italic placeholder:tw-text-light-purple"
                placeholder="Enter your message..."
                on:focus={onFocus}
                on:blur={onBlur}
                rows="1"
                bind:this={inputElement}
            />
            <button
                type="submit"
                class="tw-bg-transparent tw-h-8 tw-w-8 tw-p-0 tw-inline-flex tw-justify-center tw-items-center tw-right-0 tw-text-light-blue"
            >
                <SendIcon size="17" />
            </button>
        </div>
    </div>
</form>

<style lang="scss">
    form {
        display: flex;
        padding-left: 4px;
        padding-right: 4px;

        // button {
        //     background-color: #254560;
        //     border-bottom-right-radius: 4px;
        //     border-top-right-radius: 4px;
        //     border: none;
        //     border-left: solid white 1px;
        //     font-size: 16px;
        // }
    }
</style>
