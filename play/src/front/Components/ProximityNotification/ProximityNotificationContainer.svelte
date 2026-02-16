<script lang="ts">
    import { chatNotificationStore } from "../../Stores/ProximityNotificationStore";
    import ProximityNotification from "./ProximityNotification.svelte";

    const MAX_NOTIFICATIONS = 4;
</script>

{#if $chatNotificationStore.length > 0}
    <div class="fixed left-4 bottom-0 pointer-events-none flex flex-col items-start pb-4 z-[900]">
        {#each $chatNotificationStore.slice(-MAX_NOTIFICATIONS) as notification (notification.id)}
            <div class="flex justify-start mb-2">
                <ProximityNotification {notification} />
            </div>
        {/each}
    </div>
{/if}
