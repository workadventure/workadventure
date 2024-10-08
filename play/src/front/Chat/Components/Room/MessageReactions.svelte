<script lang="ts">
    import { MapStore } from "@workadventure/store-utils";
    import { ChatMessageReaction } from "../../Connection/ChatConnection";
    import Reaction from "./Reaction.svelte";

    export let reactions: MapStore<string, ChatMessageReaction>;
    export let classes = "";
</script>

<div class="tw-absolute -tw-bottom-4 tw-flex tw-flex-row tw-flex-wrap tw-rounded-3xl {classes}">
    {#each [...$reactions] as [reactionKey, reaction] (reactionKey)}
        <Reaction {reaction} />
    {/each}
</div>
