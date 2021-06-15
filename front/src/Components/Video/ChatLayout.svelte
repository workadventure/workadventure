<script lang="ts">
    import Peer from "./Peer.svelte";
    import {layoutStore} from "../../Stores/LayoutStore";
    import {onDestroy} from "svelte";

    let cssClass = 'one-col';

    const unsubscribe = layoutStore.subscribe((displayableMedias) => {
        const nbUsers = displayableMedias.size;
        if (nbUsers <= 1) {
            cssClass = 'one-col';
        } else if (nbUsers <= 4) {
            cssClass = 'two-col';
        } else if (nbUsers <= 9) {
            cssClass = 'three-col';
        } else {
            cssClass = 'four-col';
        }
    });

    onDestroy(() => {
        unsubscribe();
    });
</script>

<div class="chat-mode {cssClass}">
    {#each [...$layoutStore.values()] as peer (peer.uniqueId)}
        <Peer peer={peer}></Peer>
    {/each}
</div>
