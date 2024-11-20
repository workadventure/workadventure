<script lang="ts">
    import { get } from "svelte/store";
    import { ChatRoom } from "../../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../../Stores/ChatStore";
    import { ProximityChatRoom } from "../../../Connection/Proximity/ProximityChatRoom";
    import Tooltip from "../../../../Components/Util/Tooltip.svelte";
    import { LL } from "../../../../../i18n/i18n-svelte";
    import { chatInputFocusStore } from "../../../../Stores/ChatStore";
    import { IconLoader, IconPaperclip } from "@wa-icons";

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
    }

    function focusChatInput() {
        // Disable input manager to prevent the game from receiving the input
        chatInputFocusStore.set(true);
    }
    function unfocusChatInput() {
        // Enable input manager to allow the game to receive the input
        chatInputFocusStore.set(false);
    }
</script>

<div>
    {#if isProximityChatRoom}
        <Tooltip leftPosition={"true"} text={$LL.chat.featureComingSoon()} />
    {/if}
    <input
        id="upload"
        class="hidden"
        disabled={isProximityChatRoom}
        type="file"
        multiple
        bind:files
        data-testid="uploadCustomAsset"
        on:focusin={focusChatInput}
        on:focusout={unfocusChatInput}
    />
    <label
        for="upload"
        class="p-0 m-0 h-11 w-11 flex items-center justify-center hover:bg-white/10 rounded-none"
    >
        {#if files !== undefined}
            <IconLoader class="animate-spin" font-size={18} />
        {:else}
            <IconPaperclip
                class="hover:!cursor-pointer {room instanceof ProximityChatRoom
                    ? 'opacity-30 !cursor-none'
                    : ''}"
                font-size={18}
            />
        {/if}
    </label>
</div>
