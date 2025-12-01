<script lang="ts">
    import { proximityNotificationStore } from "../../Stores/ProximityNotificationStore";
    import ProximityNotification from "./ProximityNotification.svelte";

    const MAX_NOTIFICATIONS = 3;
</script>

{#if $proximityNotificationStore.length > 0}
    <div class="fixed left-4 bottom-[100px] pointer-events-none flex flex-col items-start pb-4 z-[900]">
        {#each $proximityNotificationStore.slice(0, MAX_NOTIFICATIONS) as notification (notification.id)}
            <div class="flex justify-start mb-2">
                <ProximityNotification {notification} />
            </div>
        {/each}
    </div>
{/if}
