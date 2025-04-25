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
        inputClass=" p-1  !m-0 px-2 max-h-36 overflow-auto w-full h-full rounded-md !leading-6 block !text-sm !text-white !bg-white/20 placeholder:text-sm  !text-black border  resize-none  shadow-none focus:ring-0"
        dataText={$LL.chat.enter()}
    />

    {#if editError}
        <p class="text-red-500 text-xxs p-0 m-0">{$LL.chat.messageEditedError()}</p>
    {/if}
    <div class="flex flew-row gap-1 justify-center p-1">
        <button
            class="hover:bg-white/10 text-white py-0.5 text-sm px-3 w-full text-center items-center justify-center rounded"
            data-testid="cancelMessageEditionButton"
            on:click={() => selectedChatMessageToEdit.set(null)}
        >
            {$LL.chat.createRoom.buttons.cancel()}
        </button>
        <button
            class="bg-white hover:bg-white/80 text-secondary py-0.5 text-sm px-3 w-full text-center items-center justify-center rounded"
            data-testid="saveMessageEditionButton"
            on:click={() => editMessage(inputValue)}
        >
            {$LL.chat.createRoom.buttons.edit()}
        </button>
    </div>
</div>
