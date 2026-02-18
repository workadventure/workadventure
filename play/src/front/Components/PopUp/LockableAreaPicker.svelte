<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { clickOutside } from "svelte-outside";
    import { LL } from "../../../i18n/i18n-svelte";
    import type { LockableAreaEntry } from "../../Stores/CurrentPlayerAreaLockStore";
    import LockIcon from "../Icons/LockIcon.svelte";
    import LockOpenIcon from "../Icons/LockOpenIcon.svelte";

    export let areas: LockableAreaEntry[] = [];
    export let areasWithPermission: Set<string> = new Set();
    export let onSelect: (entry: LockableAreaEntry) => void;
    export let onClose: (() => void) | undefined = undefined;

    /** When defined, show a row for the discussion bubble (group lock) in the list. */
    export let groupLockState: boolean | undefined = undefined;
    /** Callback when the user selects the bubble row. Only used when groupLockState is defined. */
    export let onSelectGroupLock: (() => void) | undefined = undefined;

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function handleClose(): void {
        dispatch("close");
        onClose?.();
    }

    function handleSelect(entry: LockableAreaEntry): void {
        onSelect(entry);
        handleClose();
    }

    function handleSelectGroupLock(): void {
        onSelectGroupLock?.();
        handleClose();
    }

    function entryKey(entry: LockableAreaEntry): string {
        return `${entry.areaId}:${entry.propertyId}`;
    }

    function canLock(entry: LockableAreaEntry): boolean {
        return areasWithPermission.has(entryKey(entry));
    }

    $: showBubbleRow = groupLockState !== undefined && onSelectGroupLock !== undefined;
</script>

<div
    data-testid="lockable-area-picker"
    class="bg-contrast/80 backdrop-blur-md rounded-md shadow-lg p-2 max-w-96 overflow-auto flex flex-col gap-1"
    use:clickOutside={handleClose}
>
    <div class="text-sm font-semibold text-white px-2 pb-1">
        {$LL.actionbar.help.lock.areaPickerTitle()}
    </div>

    {#if showBubbleRow}
        <button
            type="button"
            class="w-full text-left p-2 rounded transition-colors flex flex-row items-center gap-2 {groupLockState
                ? 'bg-red-500/30 hover:bg-red-500/40'
                : 'hover:bg-white/10'}"
            data-testid="lockable-area-option-bubble"
            on:click={handleSelectGroupLock}
        >
            {#if groupLockState}
                <LockIcon />
            {:else}
                <LockOpenIcon />
            {/if}
            <span class="text-sm text-white flex-1 truncate">
                {$LL.actionbar.help.lock.bubbleLabel()}
            </span>
        </button>
    {/if}

    {#each areas as entry, index (entryKey(entry))}
        <button
            type="button"
            class="w-full text-left p-2 rounded transition-colors flex flex-row items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed {entry.lockState
                ? 'bg-red-500/30 hover:bg-red-500/40'
                : 'hover:bg-white/10'}"
            data-testid="lockable-area-option-{index}"
            disabled={!canLock(entry)}
            on:click={() => canLock(entry) && handleSelect(entry)}
        >
            {#if entry.lockState}
                <LockIcon />
            {:else}
                <LockOpenIcon />
            {/if}
            <span class="text-sm text-white flex-1 truncate" title={entry.areaName || entry.areaId}>
                {entry.areaName || entry.areaId}
            </span>
        </button>
    {/each}
</div>
