<script lang="ts">
    import { fly } from "svelte/transition";
    import { warningMessageStore } from "../../Stores/ErrorStore";
</script>

<div class="warning-toast" transition:fly={{ y: -200, duration: 500 }} data-testid="warning-toast">
    {#each $warningMessageStore as warningMessage, key (warningMessage.id ?? key)}
        <div class="text-center flex justify-center text-danger h-6 whitespace-pre-line truncate text-ellipsis">
            ⚠️ {warningMessage.message} ⚠️
        </div>
    {/each}
</div>
