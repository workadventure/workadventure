<script lang="ts">
    import { raisedHandsOrderStore } from "../../Stores/RaisedHandsStore";
    import RaiseHandIcon from "../Icons/RaiseHandIcon.svelte";

    interface Props {
        spaceUserId: string;
    }

    let { spaceUserId }: Props = $props();

    // 1-based order in which this participant raised their hand (undefined when the hand is not raised).
    let position = $derived($raisedHandsOrderStore.get(spaceUserId));
</script>

{#if position !== undefined}
    <div class="flex items-center gap-1 px-1 pointer-events-none" data-testid="raised-hand-badge">
        <RaiseHandIcon height="h-4" width="w-4" strokeColor="stroke-current" hover="" />
        <!-- The order only matters when several hands are raised. -->
        {#if $raisedHandsOrderStore.size > 1}
            <span class="text-sm font-bold leading-none tabular-nums">{position}</span>
        {/if}
    </div>
{/if}
