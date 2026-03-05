<script lang="ts">
    import type { ProximitySessionParticipant } from "../../Connection/ChatConnection";
    import LL from "../../../../i18n/i18n-svelte";

    export let participant: ProximitySessionParticipant;
    $: pictureStore = participant.pictureStore;
    $: displayName = participant.isCurrentUser ? $LL.chat.you() : participant.name;
</script>

<div class="flex items-center gap-2 rounded-full bg-white/10 pl-1 pr-3 py-1">
    {#if $pictureStore}
        <img src={$pictureStore} alt="" class="w-8 h-8 rounded-full object-cover flex-shrink-0" />
    {:else}
        <div
            class="w-8 h-8 rounded-full bg-white/20 flex-shrink-0 flex items-center justify-center text-white/60 text-xs"
        >
            ?
        </div>
    {/if}
    <span class="text-sm text-white/90 truncate max-w-[120px]">{displayName}</span>
</div>
