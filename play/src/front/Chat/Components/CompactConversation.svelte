<script lang="ts">
    import { trackFormFocus } from "../../Utils/trackFormFocus";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import { onDestroy, onMount } from "svelte";
    import type { ChatRoom, ChatThread } from "../Connection/ChatConnection";
    import { createCompactChatInteraction, provideChatInteraction } from "../ChatInteractionContext";
    import RoomTimeline from "./Room/RoomTimeline.svelte";
    import ChatImagePreviewModal from "./ChatImagePreviewModal.svelte";

    let { room, ownerDocument }: { room: ChatRoom; ownerDocument: Document } = $props();
    let thread: ChatThread | undefined = $state();
    let preview: { url: string; alt?: string } | undefined = $state();
    const interaction = createCompactChatInteraction((next) => {
        thread = next;
    });
    interaction.openImage = (url, alt) => {
        preview = { url, alt };
    };
    provideChatInteraction(interaction);
    onMount(() => trackFormFocus(ownerDocument, (focused) => inputFormFocusStore.set(focused)));
    onDestroy(() => {
        interaction.reply.set(null);
        interaction.edit.set(null);
    });
</script>

<div class="flex flex-1 min-h-0 flex-col overflow-hidden" data-testid="companion-conversation">
    {#key thread?.id ?? room.id}
        <RoomTimeline
            room={thread ?? room}
            compactHeader={!thread}
            backAction={() => {
                thread = undefined;
            }}
        />
    {/key}
    {#if preview}
        <ChatImagePreviewModal
            {...preview}
            {ownerDocument}
            onClose={() => {
                preview = undefined;
            }}
        />
    {/if}
</div>
