<script lang="ts">
    import { get } from "svelte/store";
    import { createEventDispatcher, onMount } from "svelte";
    import { ChatRoom } from "../../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../../Stores/ChatStore";
    import { ProximityChatRoom } from "../../../Connection/Proximity/ProximityChatRoom";
    import { chatInputFocusStore } from "../../../../Stores/ChatStore";
    import { IconLoader, IconPaperclip, IconX } from "@wa-icons";

    const dispatch = createEventDispatcher();

    let files: FileList | undefined = undefined;
    export let room: ChatRoom;
    const isProximityChatRoom = room instanceof ProximityChatRoom;

    $: {
        if (files) {
            room.sendFiles(files)
                .then(() => {
                    files = undefined;
                    unselectChatMessageToReplyIfSelected();
                })
                .catch((error) => console.error(error));
        }
    }

    function unselectChatMessageToReplyIfSelected() {
        if (get(selectedChatMessageToReply) !== null) {
            selectedChatMessageToReply.set(null);
        }
        dispatch("fileUploaded");
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
        // Unselect chat message to reply if the input is focused
        const input = document.getElementById("labelUpload");
        input?.click();
    });
</script>

<div class="tw-relative">
    <input
        id="upload"
        class="tw-hidden"
        disabled={isProximityChatRoom}
        type="file"
        multiple
        bind:files
        data-testid="uploadChatCustomAsset"
        on:focusin={focusChatInput}
        on:focusout={unfocusChatInput}
    />
    <label
        id="labelUpload"
        for="upload"
        class="tw-p-0 tw-m-0 tw-h-11 tw-w-11 tw-flex tw-items-center tw-justify-center hover:tw-bg-white/10 tw-rounded-none"
    >
        {#if files !== undefined}
            <IconLoader class="tw-animate-spin" font-size={18} />
        {:else}
            <IconPaperclip
                class="hover:!tw-cursor-pointer {room instanceof ProximityChatRoom
                    ? 'tw-opacity-30 !tw-cursor-none'
                    : ''}"
                font-size={18}
            />
        {/if}
    </label>
    <button
        class="tw-absolute tw-top-0 tw-right-0 tw-m-1 hover:tw-bg-white/10 tw-cursor-pointer"
        on:click={() => unselectChatMessageToReplyIfSelected()}
    >
        <IconX class=" tw-text-white/50 hover:tw-text-white tw-transition-all" font-size={16} />
    </button>
</div>
