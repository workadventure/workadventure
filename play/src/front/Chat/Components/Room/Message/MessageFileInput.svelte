<script lang="ts">
    import { get } from "svelte/store";
    import { onMount } from "svelte";
    import { selectedChatMessageToReply } from "../../../Stores/ChatStore";
    import { chatInputFocusStore } from "../../../../Stores/ChatStore";
    import LL from "../../../../../i18n/i18n-svelte";
    import { IconPaperclip, IconX } from "@wa-icons";

    let files: FileList | undefined = $state(undefined);
    let fileInputElement: HTMLInputElement;

    interface Props {
        filesSelected?: (files: FileList) => void;
        fileUploaded?: () => void;
    }

    let { filesSelected = () => {}, fileUploaded = () => {} }: Props = $props();

    $effect(() => {
        if (files && files.length > 0) {
            filesSelected(files);
            fileUploaded();
            files = undefined;
            fileInputElement.value = "";
        }
    });

    function unselectChatMessageToReplyIfSelected() {
        if (get(selectedChatMessageToReply) !== null) {
            selectedChatMessageToReply.set(null);
        }
        fileUploaded();
    }

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }
    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }

    onMount(() => {
        fileInputElement.click();
    });
</script>

<div class="relative">
    <input
        id="upload"
        class="hidden"
        type="file"
        multiple
        bind:files
        bind:this={fileInputElement}
        data-testid="uploadChatCustomAsset"
        onfocusin={focusChatInput}
        onfocusout={unfocusChatInput}
    />
    <button
        type="button"
        class="p-0 m-0 h-11 w-11 flex items-center justify-center hover:bg-white/10 rounded-none"
        aria-label={$LL.chat.fileAttachment.title()}
        onclick={() => fileInputElement.click()}
    >
        <IconPaperclip class="hover:!cursor-pointer" font-size={18} />
    </button>
    <button
        class="absolute top-0 right-0 m-1 hover:bg-white/10 cursor-pointer"
        onclick={() => unselectChatMessageToReplyIfSelected()}
    >
        <IconX class=" text-white/50 hover:text-white transition-all" font-size={16} />
    </button>
</div>
