<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import { visibleRaisedHandSectionsStore } from "../../Stores/RaisedHandsAdminVisibleStore";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import type { SpaceInterface } from "../../Space/SpaceInterface";
    import { spaceLabel } from "../../Space/spaceLabel";
    import type { PictureStore } from "../../Stores/PictureStore";
    import Button from "../UI/Button.svelte";
    import Alert from "../UI/Alert.svelte";
    import RaisedHandAvatar from "./RaisedHandAvatar.svelte";

    // One section per space, each acting on its own space state: the hands of a bubble and of a megaphone the same
    // user listens to never mix, and an action always reaches the space it is shown under. Acting by spaceUserId
    // works even when the host does not have the listener's SpaceUser (megaphone without seeAttendees).
    function giveFloor(space: SpaceInterface, spaceUserId: string) {
        analyticsClient.trackAdminEvent("meeting.floor.given");
        space.state.giveFloor(spaceUserId).catch((error) => console.error(error));
    }

    function revokeFloor(space: SpaceInterface, spaceUserId: string) {
        analyticsClient.trackAdminEvent("meeting.floor.revoked");
        space.state.revokeFloor(spaceUserId).catch((error) => console.error(error));
    }

    function lowerHand(space: SpaceInterface, spaceUserId: string) {
        analyticsClient.trackAdminEvent("meeting.hand.lowered_for_participant");
        space.state.lowerHand(spaceUserId).catch((error) => console.error(error));
    }

    // Resolve a user's Woka picture, from the section's space first, then from the other spaces the host is in.
    // Returns undefined for a megaphone listener the host cannot see (no SpaceUser) — RaisedHandAvatar then falls
    // back to the name's initial.
    function getPictureStore(space: SpaceInterface, spaceUserId: string): PictureStore | undefined {
        const spaces = [space, ...gameManager.getCurrentGameScene().spaceRegistry.getAll()];
        for (const candidate of spaces) {
            const user = candidate.getSpaceUserBySpaceUserId(spaceUserId);
            if (user) {
                return user.pictureStore;
            }
        }
        return undefined;
    }

    // Name the spaces only when there is more than one to tell apart.
    let showSpaceNames = $derived($visibleRaisedHandSectionsStore.length > 1);
</script>

<div class="flex flex-col gap-1 select-none" data-testid="raised-hands-panel">
    {#each $visibleRaisedHandSectionsStore as section (section.space.getName())}
        <div class="flex flex-col gap-1" data-testid="raised-hands-section-{section.space.kind ?? 'space'}">
            {#if showSpaceNames}
                <div class="text-white text-sm font-bold px-1 pt-1 truncate">{spaceLabel(section.space)}</div>
            {/if}

            {#if section.hands.length > 0}
                <div class="flex items-center gap-2 px-1 pb-0.5">
                    <span class="text-white/70 text-xs font-bold uppercase grow"
                        >{$LL.actionbar.raisedHands.title()}</span
                    >
                    {#if section.canModerate}
                        <Button
                            variant="light"
                            class="min-w-20"
                            size="xs"
                            dataTestId="panel-lower-all-hands"
                            onclick={() =>
                                section.hands.forEach((entry) => lowerHand(section.space, entry.spaceUserId))}
                        >
                            {$LL.actionbar.raisedHands.lowerAllHands()}
                        </Button>
                    {/if}
                </div>
                {#each section.hands as entry (entry.spaceUserId)}
                    <div class="flex items-center gap-2 p-1 rounded hover:bg-white/10">
                        <RaisedHandAvatar
                            pictureStore={getPictureStore(section.space, entry.spaceUserId)}
                            name={entry.name}
                        />
                        <span class="text-white text-sm grow truncate">{entry.name}</span>
                        {#if section.floorControls}
                            <Button
                                variant="secondary"
                                class="min-w-20"
                                size="xs"
                                dataTestId="panel-give-floor"
                                onclick={() => giveFloor(section.space, entry.spaceUserId)}
                            >
                                {$LL.camera.menu.giveFloor()}
                            </Button>
                        {/if}
                        {#if section.canModerate}
                            <Button
                                class="min-w-20"
                                variant="light"
                                size="xs"
                                dataTestId="panel-lower-hand"
                                onclick={() => lowerHand(section.space, entry.spaceUserId)}
                            >
                                {$LL.actionbar.raisedHands.lowerHand()}
                            </Button>
                        {/if}
                    </div>
                {/each}
            {/if}

            {#if section.speakers.length > 0}
                <div
                    class="text-white/70 text-xs font-bold uppercase px-1 pb-0.5"
                    class:pt-2={section.hands.length > 0}
                >
                    {$LL.actionbar.raisedHands.speaking()}
                </div>
                {#each section.speakers as entry (entry.spaceUserId)}
                    <div class="flex items-center gap-2 p-1 rounded hover:bg-white/10">
                        <RaisedHandAvatar
                            pictureStore={getPictureStore(section.space, entry.spaceUserId)}
                            name={entry.name}
                        />
                        <span class="text-white text-sm grow truncate">{entry.name}</span>
                        {#if section.floorControls}
                            <Button
                                variant="danger"
                                class="min-w-20"
                                size="xs"
                                dataTestId="panel-revoke-floor"
                                onclick={() => revokeFloor(section.space, entry.spaceUserId)}
                            >
                                {$LL.camera.menu.revokeFloor()}
                            </Button>
                        {/if}
                    </div>
                {/each}
            {/if}
        </div>
    {:else}
        <Alert variant="neutral" class="w-full text-center">{$LL.actionbar.raisedHands.empty()}</Alert>
    {/each}
</div>
