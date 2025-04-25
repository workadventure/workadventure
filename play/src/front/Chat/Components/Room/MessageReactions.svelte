<script lang="ts">
    import { ChatMessageReaction } from "../../Connection/ChatConnection";
    import Reaction from "./Reaction.svelte";
    export let reactions: ChatMessageReaction[];
    export let classes = "";

    $: reactionBarWidth = `${Math.max(reactions.length * 40)}px`;
</script>

<div
    class="reactions-bar empty:hidden absolute -bottom-4 flex flex-row flex-nowrap overflow-x-scroll overflow-y-hidden rounded-3xl border border-solid border-white/10 {classes}"
    style="width: {reactionBarWidth}; transition: width 0.3s ease;"
>
    {#each reactions as reaction (reaction.key)}
        <Reaction {reaction} />
    {/each}
</div>

<style>
    .reactions-bar {
        max-width: calc(100% + 15px);
    }
    .reactions-bar::-webkit-scrollbar {
        display: none;
    }
    .reactions-bar {
        -ms-overflow-style: none;
        scrollbar-width: none;
    }
</style>
