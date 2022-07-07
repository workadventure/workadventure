<script lang="ts">
    import { flip } from "svelte/animate";
    import { banMessageStore } from "../../Stores/TypeMessageStore/BanMessageStore";
    import BanMessage from "./BanMessage.svelte";
</script>

<div class="tw-z-[800] tw-h-full tw-flex tw-items-center">
    {#each $banMessageStore.slice(0, 1) as message (message.id)}
        <div animate:flip={{ duration: 250 }} class="tw-h-2/3 tw-flex">
            <BanMessage {message} />
        </div>
    {/each}
</div>
