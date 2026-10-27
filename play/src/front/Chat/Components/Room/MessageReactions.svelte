<script lang="ts">
    import type { ChatMessageReaction } from "../../Connection/ChatConnection";
    import Reaction from "./Reaction.svelte";
    interface Props {
        reactions: ChatMessageReaction[];
        classes: string;
    }

    let { reactions, classes = "" }: Props = $props();
</script>

<div class="reactions-bar empty:hidden mt-1 flex flex-row flex-wrap gap-1 max-w-full {classes}">
    {#each reactions as reaction (reaction.key)}
        <Reaction {reaction} />
    {/each}
</div>
