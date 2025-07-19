<script lang="ts">
    import { ChatMessageReaction } from "../../Connection/ChatConnection";
    import Reaction from "./Reaction.svelte";
    export let reactions: ChatMessageReaction[];
    export let classes = "";
</script>

<div class="flex flex-row gap-1 {classes}">
    {#each reactions as reaction (reaction.key)}
        <Reaction {reaction} />
    {/each}
</div>
