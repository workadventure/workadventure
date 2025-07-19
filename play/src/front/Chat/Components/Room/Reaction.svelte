<script lang="ts">
    import { ChatMessageReaction } from "../../Connection/ChatConnection";

    export let reaction: ChatMessageReaction;

    const { reacted, key, users } = reaction;
</script>

{#if $users.size > 0}
    <div
        on:click={() => reaction.react()}
        class="flex flex-row items-center gap-1 px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-full cursor-pointer"
        data-testid={`${key}_reactionButton`}
    >
        <div class="text-sm">{key}</div>
        <div class="text-xs text-gray-600" class:font-bold={$reacted}>
            {$users.size}
        </div>
    </div>
{/if}
