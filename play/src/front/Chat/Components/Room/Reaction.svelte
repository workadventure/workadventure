<script lang="ts">
    import { ChatMessageReaction } from "../../Connection/ChatConnection";

    export let reaction: ChatMessageReaction;

    const { reacted, key, users } = reaction;
</script>

{#if $users.size > 0}
    <div
        on:click={() => reaction.react()}
        class="tw-group tw-flex tw-flex-row tw-space-x-1 tw-py-1.5 tw-px-2 hover:tw-bg-white/20 tw-text-white hover:tw-cursor-pointer"
        data-testid={`${key}_reactionButton`}
    >
        <div
            class="group-hover:tw-scale-[2.5] group-hover:tw-rotate-3 tw-transition-all tw-text-xs tw-p-0 tw-m-0 hover:tw-cursor-pointer"
        >
            {key}
        </div>
        <div class="tw-text-xs tw-p-0 tw-m-0 hover:tw-cursor-pointer tw-text-white" class:tw-font-extrabold={$reacted}>
            {$users.size}
        </div>
    </div>
{/if}
