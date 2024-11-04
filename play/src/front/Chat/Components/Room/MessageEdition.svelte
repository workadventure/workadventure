<script lang="ts">
    import { get } from "svelte/store";
    import { ChatMessage } from "../../Connection/ChatConnection";
    import { selectedChatMessageToEdit } from "../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import MessageInput from "./MessageInput.svelte";

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
        dataTestid="editMessageInput"
        inputClass=" tw-p-1  !tw-m-0 tw-px-2 tw-max-h-36 tw-overflow-auto tw-w-full tw-h-full tw-rounded-xl !tw-leading-6 tw-block !tw-text-sm !tw-text-white !tw-bg-white/20 placeholder:tw-text-sm  !tw-text-black tw-border  tw-resize-none  tw-shadow-none focus:tw-ring-0"
        dataText={$LL.chat.enter()}
    />

    {#if editError}
        <p class="tw-text-red-500 tw-text-xxs tw-p-0 tw-m-0">{$LL.chat.messageEditedError()}</p>
    {/if}
    <div class="tw-flex tw-flew-row tw-gap-2 tw-justify-end tw-mt-0.5">
        <button
            class="hover:tw-bg-white/10 tw-text-white tw-py-0.5 tw-text-sm tw-px-3 tw-w-20 tw-text-center tw-items-center tw-justify-center"
            data-testid="cancelMessageEditionButton"
            on:click={() => selectedChatMessageToEdit.set(null)}
        >
            {$LL.chat.createRoom.buttons.cancel()}
        </button>
        <button
            class="tw-bg-white hover:tw-bg-white/80 tw-text-secondary tw-py-0.5 tw-text-sm tw-px-3 tw-w-20 tw-text-center tw-items-center tw-justify-center"
            data-testid="saveMessageEditionButton"
            on:click={() => editMessage(inputValue)}
        >
            {$LL.chat.createRoom.buttons.edit()}
        </button>
    </div>
</div>
