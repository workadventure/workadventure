<script lang="ts">
    import { fly } from "svelte/transition";
    import { LL } from "../../../i18n/i18n-svelte";
    import { raisedHandsStore } from "../../Stores/PeerStore";
    import { raisedHandsAdminVisibleStore } from "../../Stores/RaisedHandsStore";
    import Badge from "../UI/Badge.svelte";
    import RaiseHandIcon from "../Icons/RaiseHandIcon.svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import RaisedHandsPanel from "./RaisedHandsPanel.svelte";

    // Collapse state is component-local and defaults to expanded: the dock only mounts its content when there
    // is something to act on (see raisedHandsAdminVisibleStore), so showing it open makes the host notice it.
    let open = $state(true);
</script>

{#if $raisedHandsAdminVisibleStore}
    <!-- Docked top-right, below the top action bar, like the notification/toast stack. #main-layout is
         pointer-events-none, so the dock re-enables pointer events for itself only. -->
    <div
        class="pointer-events-auto absolute end-2 top-2 z-[700] flex w-72 max-w-[calc(100vw-1rem)] flex-row items-stretch gap-1"
        data-testid="raised-hands-dock"
        transition:fly={{ x: 210, duration: 500 }}
    >
        <div class="w-2 shrink-0 rounded-lg bg-secondary my-1"></div>
        <div class="grow overflow-hidden rounded-lg bg-contrast/50 text-white backdrop-blur-md">
            <button
                type="button"
                class="flex w-full items-center gap-2 p-2 transition-colors hover:bg-white/10"
                aria-expanded={open}
                aria-controls="raised-hands-dock-body"
                aria-label={$LL.actionbar.raisedHands.title()}
                data-testid="raised-hands-dock-toggle"
                onclick={() => (open = !open)}
            >
                <RaiseHandIcon height="h-5" width="w-5" hover="" />
                <span class="grow truncate text-start text-sm font-bold">{$LL.actionbar.raisedHands.title()}</span>
                {#if $raisedHandsStore.length > 0}
                    <Badge variant="secondary" size="sm">{$raisedHandsStore.length}</Badge>
                {/if}
                <span
                    class="inline-flex transition-transform duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
                    class:rotate-180={open}
                >
                    <ChevronDownIcon height="h-5" width="w-5" hover="" />
                </span>
            </button>

            {#if open}
                <div id="raised-hands-dock-body" class="max-h-[60vh] overflow-y-auto p-2 pt-0">
                    <RaisedHandsPanel />
                </div>
            {/if}
        </div>
    </div>
{/if}
