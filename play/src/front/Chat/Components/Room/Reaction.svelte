<script lang="ts">
    import { ChatMessageReaction } from "../../Connection/ChatConnection";

    export let reaction: ChatMessageReaction;

    const { reacted, key, users } = reaction;
</script>

{#if $users.size > 0}
    <div on:click={()=>reaction.react()}
         class="tw-bg-white/50 tw-flex tw-flex-row tw-gap-1 tw-p-1 tw-rounded-md  hover:tw-bg-white/20 tw-text-white hover:tw-cursor-pointer">
        <p class="tw-text-xxs tw-p-0 tw-m-0 hover:tw-cursor-pointer">{key}</p>
        <p class="tw-text-xxs tw-p-0 tw-m-0 hover:tw-cursor-pointer"
           class:tw-font-extrabold={$reacted} class:tw-text-secondary={$reacted}>{$users.size}</p>
    </div>
{/if}