<script lang="ts">
    import { get } from "svelte/store";
    import { ChatMessage } from "../../Connection/ChatConnection";
    import { selectedChatMessageToEdit } from "../../Stores/ChatStore";
    import { IconCheck, IconX } from "@wa-icons";

    export let message: ChatMessage;

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
    <input
        class="tw-rounded-md tw-p-1 tw-border tw-border-solid"
        bind:value={inputValue}
        data-testid="editMessageInput"
    />
    {#if editError}
        <p class="tw-text-red-500 tw-text-xxs tw-p-0 tw-m-0">Unable to edit message. Try again.</p>
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
