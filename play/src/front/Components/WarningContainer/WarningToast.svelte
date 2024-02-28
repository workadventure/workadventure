<script lang="ts">
    import { fly } from "svelte/transition";
    import { warningMessageStore } from "../../Stores/ErrorStore";
</script>

<div class="warning-toast" transition:fly={{ y: -200, duration: 500 }}>
    {#each $warningMessageStore as warningMessage, key (warningMessage.id ?? key)}
        <div
            class="tw-text-center tw-flex tw-justify-center tw-text-danger tw-h-6 tw-whitespace-pre-line tw-truncate tw-text-ellipsis"
        >
            ⚠️ {warningMessage.message} ⚠️
        </div>
    {/each}
</div>
