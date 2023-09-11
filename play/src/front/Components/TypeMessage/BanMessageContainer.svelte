<script lang="ts">
    import { flip } from "svelte/animate";
    import { banMessageStore } from "../../Stores/TypeMessageStore/BanMessageStore";
    import BanMessage from "./BanMessage.svelte";
</script>

<div class="z-[800] h-full flex items-center justify-center">
    {#each $banMessageStore.slice(0, 1) as message (message.id)}
        <div animate:flip={{ duration: 250 }} class="h-2/3 flex justify-center">
            <BanMessage {message} />
        </div>
    {/each}
</div>
