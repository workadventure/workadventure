<script lang="ts">

    import { get } from "svelte/store";
    import { IconCheck, IconX } from "@tabler/icons-svelte";
    import { ChatMessage } from "../../Connection/ChatConnection";
    import { selectedChatMessageToEdit } from "../../Stores/ChatStore";

    export let message: ChatMessage;

    let inputValue = get(message.content).body;
    let editError = false;

    async function editMessage(newContent: string) {
        try {
            await message.edit(newContent)
            selectedChatMessageToEdit.set(null);
        } catch (error) {
            console.error(error);
            editError = true
            setTimeout(()=>{editError=false},2000)
        }

    }

</script>
<div>
    <input class="tw-rounded-md tw-p-1" bind:value={inputValue} />
    {#if editError}
        <p class="tw-text-red-500 tw-text-xxs tw-p-0 tw-m-0">Unable to edit message. Try again.</p>
    {/if}
    <div class="tw-flex tw-flew-row tw-gap-2 tw-justify-end">
        <button class="tw-text-xs tw-text-red-500 tw-p-0 tw-m-0" on:click={()=>selectedChatMessageToEdit.set(null)}>
            <IconX size={16} />
        </button>
        <button class="tw-text-xs tw-text-green-500 tw-p-0 tw-m-0" on:click={()=>editMessage(inputValue)}>
            <IconCheck size={16} />
        </button>
    </div>
</div>
