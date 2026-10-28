<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import type { ChatMessage } from "../../Connection/ChatConnection";
    import { selectedChatMessageToEdit } from "../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import MessageInput from "./MessageInput.svelte";

    interface Props {
        message: ChatMessage;
    }

    let { message }: Props = $props();
    let messageInput: HTMLDivElement | undefined = $state();

    let inputValue = $state((() => get(message.content).body)());
    let editError = $state(false);
    let root: HTMLDivElement | undefined = $state();

    // Edit is often picked from the keyboard: start typing at the end of the text, and once done, land back
    // on the message rather than nowhere.
    onMount(() => {
        if (messageInput) {
            messageInput.focus();
            getSelection()?.selectAllChildren(messageInput);
            getSelection()?.collapseToEnd();
        }
        const message = root?.closest<HTMLElement>("#message");
        return () => {
            const active = document.activeElement;
            if (active === null || active === document.body || root?.contains(active)) {
                message?.focus();
            }
        };
    });

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

<div bind:this={root}>
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
            onclick={() => selectedChatMessageToEdit.set(null)}
        >
            {$LL.chat.createRoom.buttons.cancel()}
        </button>
        <button
            class="bg-white hover:bg-white/80 text-secondary py-0.5 text-sm px-3 w-full text-center items-center justify-center rounded"
            data-testid="saveMessageEditionButton"
            onclick={() => editMessage(inputValue)}
        >
            {$LL.chat.createRoom.buttons.edit()}
        </button>
    </div>
</div>
