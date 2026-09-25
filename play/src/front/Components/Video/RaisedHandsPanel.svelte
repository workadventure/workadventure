<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { raisedHandsStore, speakingUsersStore } from "../../Stores/PeerStore";
    import { canModerateRaisedHandsStore, floorControlsVisibleStore } from "../../Stores/RaisedHandsAdminVisibleStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { PictureStore } from "../../Stores/PictureStore";
    import Button from "../UI/Button.svelte";
    import Alert from "../UI/Alert.svelte";
    import RaisedHandAvatar from "./RaisedHandAvatar.svelte";

    // The host acts on users by spaceUserId through the SpaceRegistry: it resolves the right space (from the
    // raised-hands queue for give, from the floor holders for take-back) and changes the space state. This works
    // even when the host does not have the listener's SpaceUser (megaphone without seeAttendees).
    function giveFloor(spaceUserId: string) {
        analyticsClient.trackAdminEvent("meeting.floor.given");
        gameManager
            .getCurrentGameScene()
            .spaceRegistry.giveFloor(spaceUserId)
            .catch((error) => console.error(error));
    }

    function revokeFloor(spaceUserId: string) {
        analyticsClient.trackAdminEvent("meeting.floor.revoked");
        gameManager
            .getCurrentGameScene()
            .spaceRegistry.revokeFloor(spaceUserId)
            .catch((error) => console.error(error));
    }

    function lowerHand(spaceUserId: string) {
        analyticsClient.trackAdminEvent("meeting.hand.lowered_for_participant");
        gameManager
            .getCurrentGameScene()
            .spaceRegistry.lowerHand(spaceUserId)
            .catch((error) => console.error(error));
    }

    function lowerAllHands() {
        for (const entry of $raisedHandsStore) {
            lowerHand(entry.spaceUserId);
        }
    }

    // Resolve a user's Woka picture across the spaces the host is in. Returns undefined for a megaphone
    // listener the host cannot see (no SpaceUser) — RaisedHandAvatar then falls back to the name's initial.
    function getPictureStore(spaceUserId: string): PictureStore | undefined {
        for (const space of gameManager.getCurrentGameScene().spaceRegistry.getAll()) {
            const user = space.getSpaceUserBySpaceUserId(spaceUserId);
            if (user) {
                return user.pictureStore;
            }
        }
        return undefined;
    }
</script>

<div class="flex flex-col gap-1 select-none" data-testid="raised-hands-panel">
    {#if $raisedHandsStore.length > 0}
        <div class="flex items-center gap-2 px-1 pb-0.5">
            <span class="text-white/70 text-xs font-bold uppercase grow">{$LL.actionbar.raisedHands.title()}</span>
            {#if $canModerateRaisedHandsStore}
                <Button variant="light" size="xs" dataTestId="panel-lower-all-hands" onclick={lowerAllHands}>
                    {$LL.actionbar.raisedHands.lowerAllHands()}
                </Button>
            {/if}
        </div>
        {#each $raisedHandsStore as entry (entry.spaceUserId)}
            <div class="flex items-center gap-2 p-1 rounded hover:bg-white/10">
                <RaisedHandAvatar pictureStore={getPictureStore(entry.spaceUserId)} name={entry.name} />
                <span class="text-white text-sm grow truncate">{entry.name}</span>
                {#if $floorControlsVisibleStore}
                    <Button
                        variant="secondary"
                        size="xs"
                        dataTestId="panel-give-floor"
                        onclick={() => giveFloor(entry.spaceUserId)}
                    >
                        {$LL.camera.menu.giveFloor()}
                    </Button>
                {/if}
                {#if $canModerateRaisedHandsStore}
                    <Button
                        variant="light"
                        size="xs"
                        dataTestId="panel-lower-hand"
                        onclick={() => lowerHand(entry.spaceUserId)}
                    >
                        {$LL.actionbar.raisedHands.lowerHand()}
                    </Button>
                {/if}
            </div>
        {/each}
    {/if}

    {#if $speakingUsersStore.length > 0}
        <div class="text-white/70 text-xs font-bold uppercase px-1 pb-0.5" class:pt-2={$raisedHandsStore.length > 0}>
            {$LL.actionbar.raisedHands.speaking()}
        </div>
        {#each $speakingUsersStore as entry (entry.spaceUserId)}
            <div class="flex items-center gap-2 p-1 rounded hover:bg-white/10">
                <RaisedHandAvatar pictureStore={getPictureStore(entry.spaceUserId)} name={entry.name} />
                <span class="text-white text-sm grow truncate">{entry.name}</span>
                {#if $floorControlsVisibleStore}
                    <Button
                        variant="danger"
                        size="xs"
                        dataTestId="panel-revoke-floor"
                        onclick={() => revokeFloor(entry.spaceUserId)}
                    >
                        {$LL.camera.menu.revokeFloor()}
                    </Button>
                {/if}
            </div>
        {/each}
    {/if}

    {#if $raisedHandsStore.length === 0 && $speakingUsersStore.length === 0}
        <Alert variant="neutral" class="w-full text-center">{$LL.actionbar.raisedHands.empty()}</Alert>
    {/if}
</div>
