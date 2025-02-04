<script lang="ts">
    import { ChatMessageReaction } from "../../Connection/ChatConnection";

    export let reaction: ChatMessageReaction;

    const { reacted, key, users } = reaction;
</script>

{#if $users.size > 0}
    <div
        on:click={() => reaction.react()}
        class="group flex flex-row space-x-1 py-1.5 px-2 hover:bg-white/20 text-white hover:cursor-pointer"
        data-testid={`${key}_reactionButton`}
    >
        <div class="group-hover:scale-[2.5] group-hover:rotate-3 transition-all text-xs p-0 m-0 hover:cursor-pointer">
            {key}
        </div>
        <div class="text-xs p-0 m-0 hover:cursor-pointer text-white" class:font-extrabold={$reacted}>
            {$users.size}
        </div>
    </div>
{/if}
