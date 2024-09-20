<script lang="ts">
    import { get } from "svelte/store";
    import { ChatMessage } from "../../Connection/ChatConnection";
    import { selectedChatMessageToEdit } from "../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import MessageInput from "./MessageInput.svelte";
    import { IconCheck, IconX } from "@wa-icons";

    export let message: ChatMessage;
    let messageInput: HTMLDivElement;

    let inputValue = get(message.content).body;
    let editError = false;

    async function editMessage(newContent: string) {
        try {
            await message.edit(newContent);
            selectedChatMessageToEdit.set(null);
        } catch (error) {
            console.error(error);
            editError = true;
            setTimeout(() => {
                editError = false;
            }, 2000);
        }
    }
</script>

<div>
    <MessageInput
        bind:message={inputValue}
        bind:messageInput
        inputClass=" tw-p-1  !tw-m-0 tw-px-2 tw-max-h-36 tw-overflow-auto tw-w-full tw-h-full tw-rounded-xl  tw-block !tw-bg-white placeholder:tw-text-sm  !tw-text-black tw-border  tw-resize-none  tw-shadow-none focus:tw-ring-0"
        dataText={$LL.chat.enter()}
    />

    {#if editError}
        <p class="tw-text-red-500 tw-text-xxs tw-p-0 tw-m-0">{$LL.chat.messageEditedError()}</p>
    {/if}
    <div class="tw-flex tw-flew-row tw-gap-2 tw-justify-end">
        <button
            class="tw-text-xs tw-text-red-500 tw-p-0 tw-m-0"
            data-testid="cancelMessageEditionButton"
            on:click={() => selectedChatMessageToEdit.set(null)}
        >
            <IconX font-size={16} />
        </button>
        <button
            class="tw-text-xs tw-text-green-500 tw-p-0 tw-m-0"
            data-testid="saveMessageEditionButton"
            on:click={() => editMessage(inputValue)}
        >
            <IconCheck font-size={16} />
        </button>
    </div>
</div>
