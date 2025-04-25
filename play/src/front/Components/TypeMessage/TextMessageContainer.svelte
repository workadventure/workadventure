<script lang="ts">
    import { textMessageStore } from "../../Stores/TypeMessageStore/TextMessageStore";
    import TextMessage from "./TextMessage.svelte";

    const MAX_MESSAGES = 3;
</script>

<div class="main-text-message-container flex">
    {#each $textMessageStore.slice(0, MAX_MESSAGES) as message (message.id)}
        <div class="flex">
            <TextMessage {message} />
        </div>
    {/each}
</div>

<style lang="scss">
    .main-text-message-container {
        padding-top: 16px;
        z-index: 800;
    }
</style>
