<script lang="ts">
    import { flip } from "svelte/animate";
    import { banMessageStore } from "../../Stores/TypeMessageStore/BanMessageStore";
    import BanMessage from "./BanMessage.svelte";
</script>

<div class="main-ban-message-container">
    {#each $banMessageStore.slice(0, 1) as message (message.id)}
        <div animate:flip={{ duration: 250 }}>
            <BanMessage {message} />
        </div>
    {/each}
</div>

<style lang="scss">
    .main-ban-message-container {
        z-index: 800;
    }
</style>
