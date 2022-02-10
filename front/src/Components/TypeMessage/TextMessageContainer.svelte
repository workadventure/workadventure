<script lang="ts">
    import { flip } from "svelte/animate";
    import TextMessage from "./TextMessage.svelte";
    import { textMessageStore } from "../../Stores/TypeMessageStore/TextMessageStore";

    const MAX_MESSAGES = 3;
</script>

<div class="main-text-message-container">
    {#each $textMessageStore.slice(0, MAX_MESSAGES) as message (message.id)}
        <div animate:flip={{ duration: 250 }}>
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
