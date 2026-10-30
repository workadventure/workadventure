<script lang="ts">
    import { onMount } from "svelte";
    import { get } from "svelte/store";
    import type { ChatMessage } from "../../Connection/ChatConnection";
    import { selectedChatMessageToEdit } from "../../Stores/ChatStore";
    import LL from "../../../../i18n/i18n-svelte";
    import Button from "../../../Components/UI/Button.svelte";
    import Alert from "../../../Components/UI/Alert.svelte";
    import MessageInput from "./MessageInput.svelte";

    interface Props {
        message: ChatMessage;
    }

    let { message }: Props = $props();
    let messageInput: HTMLDivElement | undefined = $state();

    let inputValue = $state((() => get(message.content).body)());
    // Stays until the next try, so a failure is not missed.
    let editError = $state(false);
    let saving = $state(false);
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
        editError = false;
        saving = true;
        try {
            await message.edit(newContent);
            selectedChatMessageToEdit.set(null);
        } catch (error) {
            console.error(error);
            editError = true;
        } finally {
            saving = false;
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
        <Alert variant="danger" class="mt-1 w-full">{$LL.chat.messageEditedError()}</Alert>
    {/if}
    <div class="flex flex-row gap-1 justify-center p-1">
        <Button
            variant="contrast"
            size="sm"
            class="flex-1"
            dataTestId="cancelMessageEditionButton"
            onclick={() => selectedChatMessageToEdit.set(null)}
        >
            {$LL.chat.confirm.cancel()}
        </Button>
        <Button
            variant="secondary"
            size="sm"
            class="flex-1"
            dataTestId="saveMessageEditionButton"
            disabled={saving}
            onclick={() => {
                editMessage(inputValue).catch((error) => console.error(error));
            }}
        >
            {$LL.chat.confirm.save()}
        </Button>
    </div>
</div>
