<script lang="ts">
    import { onDestroy } from "svelte";
    import { liveAnnouncementsStore, watchRaisedHands } from "../Stores/LiveAnnouncerStore";
    import { raisedHandSectionsStore } from "../Stores/PeerStore";

    onDestroy(watchRaisedHands(raisedHandSectionsStore));
</script>

<!-- The regions must be in the page before anything is announced: a region inserted with its text is not read. -->
<div class="sr-only" role="status" aria-live="polite" data-testid="liveRegionPolite">
    {#each $liveAnnouncementsStore.filter((a) => a.politeness === "polite") as announcement (announcement.id)}
        <p>{announcement.message}</p>
    {/each}
</div>
<div class="sr-only" role="alert" aria-live="assertive" data-testid="liveRegionAssertive">
    {#each $liveAnnouncementsStore.filter((a) => a.politeness === "assertive") as announcement (announcement.id)}
        <p>{announcement.message}</p>
    {/each}
</div>
