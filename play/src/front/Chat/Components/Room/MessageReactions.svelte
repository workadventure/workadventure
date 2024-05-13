<script lang="ts">
    import { MapStore } from "@workadventure/store-utils";
    import { ChatMessageReaction } from "../../Connection/ChatConnection";
    import Reaction from "./Reaction.svelte";

    export let reactions: MapStore<string, ChatMessageReaction>;

</script>


<div class="tw-flex tw-flex-row tw-gap-1 tw-mt-1 tw-flex-wrap">
    {#each [...$reactions] as [reactionKey, reaction](reactionKey)}
        <Reaction {reaction} />
    {/each}
</div>
