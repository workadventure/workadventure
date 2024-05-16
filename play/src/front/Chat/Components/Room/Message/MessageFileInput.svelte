<script lang="ts">
    import { IconLoader, IconPaperclip } from "@tabler/icons-svelte";
    import { get } from "svelte/store";
    import { ChatRoom } from "../../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../../Stores/ChatStore";

    let files: FileList | undefined = undefined;
    export let room: ChatRoom;

    $: {
        if (files) {
            room.sendFiles(files).then(() => {
                files = undefined;
                unselectChatMessageToReplyIfSelected()
            }).catch(error => console.error(error));
        }
    }

    function unselectChatMessageToReplyIfSelected() {
        if (get(selectedChatMessageToReply) !== null) {
            selectedChatMessageToReply.set(null);
        }
    }


</script>

<div>
    <input
        id="upload"
        class="tw-hidden"
        type="file"
        multiple
        bind:files
        data-testid="uploadCustomAsset"
    />
    <label for="upload" class="tw-p-0 tw-m-0">
        {#if files !== undefined}
            <IconLoader class="tw-animate-spin" size={18}  />
        {:else}
            <IconPaperclip class="hover:!tw-cursor-pointer" size={18} />
        {/if}
    </label>
</div>
