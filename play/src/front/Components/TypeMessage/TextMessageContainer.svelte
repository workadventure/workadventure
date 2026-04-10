<script lang="ts">
    import { textMessageStore } from "../../Stores/TypeMessageStore/TextMessageStore";
    import TextMessage from "./TextMessage.svelte";

    const MAX_MESSAGES = 3;

    $: messages = $textMessageStore.slice(0, MAX_MESSAGES);
</script>

{#if messages.length > 0}
    <div class="fixed left-0 right-0 top-0 w-full z-[900] pointer-events-none pt-4">
        {#each messages as message (message.id)}
            <div class="flex justify-center">
                <TextMessage {message} />
            </div>
        {/each}
    </div>
{/if}
