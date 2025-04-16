<script lang="ts">
    import { MapStore } from "@workadventure/store-utils";
    import { ChatMessageReaction } from "../../Connection/ChatConnection";
    import Reaction from "./Reaction.svelte";
    export let reactions:  ChatMessageReaction[]
    export let classes = "";
</script>

<div class="reactions-bar absolute -bottom-4 flex flex-row flex-wrap rounded-3xl {classes}">
    {#each reactions as reaction (reaction.key)}
        <Reaction {reaction} />
    {/each}
</div>
