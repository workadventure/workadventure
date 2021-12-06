<script lang="ts">
    import { streamableCollectionStore } from "../../Stores/StreamableCollectionStore";
    import { afterUpdate, onDestroy } from "svelte";
    import { biggestAvailableAreaStore } from "../../Stores/BiggestAvailableAreaStore";
    import MediaBox from "./MediaBox.svelte";

    let cssClass = "one-col";

    const unsubscribe = streamableCollectionStore.subscribe((displayableMedias) => {
        const nbUsers = displayableMedias.size;
        if (nbUsers <= 1) {
            cssClass = "one-col";
        } else if (nbUsers <= 4) {
            cssClass = "two-col";
        } else if (nbUsers <= 9) {
            cssClass = "three-col";
        } else {
            cssClass = "four-col";
        }
    });

    onDestroy(() => {
        unsubscribe();
    });

    afterUpdate(() => {
        biggestAvailableAreaStore.recompute();
    });
</script>

<div class="chat-mode {cssClass}">
    {#each [...$streamableCollectionStore.values()] as peer (peer.uniqueId)}
        <MediaBox streamable={peer} />
    {/each}
</div>
