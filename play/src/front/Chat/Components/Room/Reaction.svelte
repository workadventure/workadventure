<script lang="ts">
    import { ChatMessageReaction } from "../../Connection/ChatConnection";

    export let reaction: ChatMessageReaction;

    const { reacted, key, users } = reaction;
</script>

{#if $users.size > 0}
    <div on:click={()=>reaction.react()}
         class="tw-flex tw-flex-row tw-gap-1 tw-p-1 tw-rounded-md tw-border tw-border-solid tw-border-light-purple hover:tw-bg-white/20 hover:tw-cursor-pointer"
         class:tw-bg-light-purple={$reacted}>
        <p class="tw-text-xxs tw-p-0 tw-m-0 hover:tw-cursor-pointer">{key}</p>
        <p class="tw-text-xxs tw-p-0 tw-m-0 hover:tw-cursor-pointer"
           class:tw-text-blue-500={$reacted}>{$users.size}</p>
    </div>
{/if}