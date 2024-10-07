<script lang="ts">
    import { get } from "svelte/store";
    import { ChatRoom } from "../../../Connection/ChatConnection";
    import { selectedChatMessageToReply } from "../../../Stores/ChatStore";
    import { ProximityChatRoom } from "../../../Connection/Proximity/ProximityChatRoom";
    import Tooltip from "../../../../Components/Util/Tooltip.svelte";
    import { LL } from "../../../../../i18n/i18n-svelte";
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
</script>

<div>
    {#if isProximityChatRoom}
        <Tooltip leftPosition={"true"} text={$LL.chat.featureComingSoon()} />
    {/if}
    <input
        id="upload"
        class="tw-hidden"
        disabled={isProximityChatRoom}
        type="file"
        multiple
        bind:files
        data-testid="uploadCustomAsset"
    />
    <label
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
</div>
