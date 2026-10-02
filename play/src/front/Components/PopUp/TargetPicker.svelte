<script lang="ts">
    import type { Snippet } from "svelte";
    import type { Readable } from "svelte/store";
    import { clickOutside } from "svelte-outside";
    import type { TargetRow } from "../ActionBar/MenuIcons/TargetPickerController";

    interface Props {
        title: string;
        /** A store, so the picker follows changes while it is open. */
        rows: Readable<TargetRow[]>;
        testId: string;
        /** How a selected row stands out: red for a restriction (lock), neutral otherwise. */
        variant?: "danger" | "neutral";
        icon: Snippet<[TargetRow]>;
        onselect: (row: TargetRow) => void;
        onclose: () => void;
    }

    let { title, rows, testId, variant = "neutral", icon, onselect, onclose }: Props = $props();

    let selectedClass = $derived(
        variant === "danger" ? "bg-red-500/30 hover:bg-red-500/40" : "bg-white/20 hover:bg-white/30",
    );

    function handleSelect(row: TargetRow): void {
        if (row.disabled) {
            return;
        }
        onselect(row);
        onclose();
    }
</script>

<div
    data-testid={testId}
    class="bg-contrast/80 backdrop-blur-md rounded-md shadow-lg p-2 max-w-96 overflow-auto flex flex-col gap-1"
    use:clickOutside={onclose}
>
    <div class="text-sm font-semibold text-white px-2 pb-1">{title}</div>

    {#each $rows as row (row.id)}
        <button
            type="button"
            class="w-full text-left p-2 rounded transition-colors flex flex-row items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed {row.selected
                ? selectedClass
                : 'hover:bg-white/10'}"
            data-testid={row.testId}
            aria-pressed={row.selected}
            disabled={row.disabled}
            onclick={() => handleSelect(row)}
        >
            {@render icon(row)}
            <span class="text-sm text-white flex-1 truncate" title={row.label}>{row.label}</span>
        </button>
    {/each}
</div>
