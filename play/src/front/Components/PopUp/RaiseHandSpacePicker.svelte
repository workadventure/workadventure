<script module lang="ts">
    export interface RaiseHandSpaceEntry {
        spaceName: string;
        kind: string;
        label: string;
        raised: boolean;
    }
</script>

<script lang="ts">
    import { clickOutside } from "svelte-outside";
    import { LL } from "../../../i18n/i18n-svelte";
    import RaiseHandIcon from "../Icons/RaiseHandIcon.svelte";

    interface Props {
        entries: RaiseHandSpaceEntry[];
        onselect?: (entry: RaiseHandSpaceEntry) => void;
        onclose?: () => void;
    }

    let { entries = [], onselect, onclose }: Props = $props();

    function handleSelect(entry: RaiseHandSpaceEntry): void {
        onselect?.(entry);
        onclose?.();
    }
</script>

<div
    data-testid="raise-hand-space-picker"
    class="bg-contrast/80 backdrop-blur-md rounded-md shadow-lg p-2 max-w-96 overflow-auto flex flex-col gap-1"
    use:clickOutside={() => onclose?.()}
>
    <div class="text-sm font-semibold text-white px-2 pb-1">
        {$LL.actionbar.help.raiseHand.title()}
    </div>

    {#each entries as entry (entry.spaceName)}
        <button
            type="button"
            class="w-full text-left p-2 rounded transition-colors flex flex-row items-center gap-2 {entry.raised
                ? 'bg-white/20 hover:bg-white/30'
                : 'hover:bg-white/10'}"
            data-testid="raise-hand-space-option-{entry.kind}"
            aria-pressed={entry.raised}
            onclick={() => handleSelect(entry)}
        >
            <RaiseHandIcon
                height="h-5"
                width="w-5"
                strokeColor={entry.raised ? "stroke-contrast fill-white" : "stroke-white fill-transparent"}
                hover=""
            />
            <span class="text-sm text-white flex-1 truncate" title={entry.label}>{entry.label}</span>
        </button>
    {/each}
</div>
