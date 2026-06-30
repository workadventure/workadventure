<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { raisedHandsStore } from "../../Stores/PeerStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";

    // The host gives the floor by spaceUserId via the SpaceRegistry: it resolves the right space from the
    // raised-hands queue and sends the private event. This works even when the host does not have the
    // listener's SpaceUser (megaphone without seeAttendees), because the queue comes from the space metadata.
    function giveFloor(spaceUserId: string) {
        analyticsClient.giveFloorMeetingAction();
        gameManager.getCurrentGameScene().spaceRegistry.giveFloor(spaceUserId);
    }
</script>

<div
    class="flex flex-col gap-1 p-2 w-64 max-h-80 overflow-y-auto bg-contrast/80 backdrop-blur-md rounded-md select-none"
    data-testid="raised-hands-panel"
>
    <div class="text-white text-sm font-bold px-1 pb-1">{$LL.actionbar.raisedHands.title()}</div>
    {#if $raisedHandsStore.length === 0}
        <div class="text-white/70 text-sm px-1 py-2">{$LL.actionbar.raisedHands.empty()}</div>
    {:else}
        {#each $raisedHandsStore as entry, index (entry.spaceUserId)}
            <div class="flex items-center gap-2 p-1 rounded hover:bg-white/10">
                <span class="text-white text-sm font-bold tabular-nums w-5 text-center shrink-0">{index + 1}</span>
                <span class="text-white text-sm grow truncate">{entry.name}</span>
                <button
                    class="text-white text-xs bg-secondary hover:bg-secondary/80 rounded px-2 py-1 shrink-0"
                    data-testid="panel-give-floor"
                    onclick={() => giveFloor(entry.spaceUserId)}
                >
                    {$LL.camera.menu.giveFloor()}
                </button>
            </div>
        {/each}
    {/if}
</div>
