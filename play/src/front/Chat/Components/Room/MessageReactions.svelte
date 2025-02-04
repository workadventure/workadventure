<script lang="ts">
    import { MapStore } from "@workadventure/store-utils";
    import { ChatMessageReaction } from "../../Connection/ChatConnection";
    import Reaction from "./Reaction.svelte";

    export let reactions: MapStore<string, ChatMessageReaction>;
    export let classes = "";
</script>

<div class="absolute -bottom-4 flex flex-row flex-wrap rounded-3xl {classes}">
    {#each [...$reactions] as [reactionKey, reaction] (reactionKey)}
        <Reaction {reaction} />
    {/each}
</div>
