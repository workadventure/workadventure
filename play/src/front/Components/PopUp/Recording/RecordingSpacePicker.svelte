<script lang="ts">
    import type { Readable } from "svelte/store";
    import { onMount } from "svelte";
    import { clickOutside } from "svelte-outside";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { RecordingSpaceRow } from "../../ActionBar/MenuIcons/RecordingMenuUtils";
    import { RECORDER_LAYOUT_MODES } from "../../../Utils/RecorderLayout";
    import type { RecorderLayoutMode } from "../../../Utils/RecorderLayout";
    import RecordingProducerPanel from "./RecordingProducerPanel.svelte";
    import RecorderLayoutPreview from "./RecorderLayoutPreview.svelte";
    import { IconX } from "@wa-icons";

    interface Props {
        rowsStore: Readable<RecordingSpaceRow[]>;
        // Offer to film the meeting over the live map, in one of its layouts.
        withMapAvailable?: boolean;
        // layout: over the map, in this layout. Undefined: the camera grid only.
        onselect?: (row: RecordingSpaceRow, layout: RecorderLayoutMode | undefined) => void;
        // restoreFocus: closed from the keyboard, the focus goes back to the button that opened it.
        onclose?: (restoreFocus?: boolean) => void;
    }

    let { rowsStore, withMapAvailable = false, onselect, onclose = undefined }: Props = $props();

    // The person's own recordings: they stop them here, and direct them when they film the map.
    const ownRows = $derived(
        $rowsStore.filter((row) => row.status === "recording-self" || (row.status === "stopping" && row.action)),
    );
    // What can be recorded, and what the others record.
    const otherRows = $derived($rowsStore.filter((row) => !ownRows.includes(row)));
    const startableRows = $derived(otherRows.filter((row) => row.action === "start" && !row.disabled));

    let chosenSpaceName = $state<string | undefined>(undefined);
    const chosenRow = $derived(startableRows.find((row) => row.spaceName === chosenSpaceName) ?? startableRows.at(0));
    // "none": the camera grid only, as without the map.
    let chosenLayout = $state<RecorderLayoutMode | "none">("balanced");

    let root: HTMLElement | undefined = $state();

    // The picker is mounted at the root of the page, far from its button: the focus moves into it so the keyboard
    // reaches it, and Escape closes it.
    onMount(() => {
        root?.focus();
    });

    function handleClose(restoreFocus = false): void {
        onclose?.(restoreFocus);
    }

    function onKeydown(event: KeyboardEvent): void {
        if (event.key !== "Escape") return;
        event.stopPropagation();
        handleClose(true);
    }

    function select(row: RecordingSpaceRow, layout?: RecorderLayoutMode): void {
        if (row.disabled || !row.action) {
            return;
        }

        onselect?.(row, layout);
        handleClose();
    }

    function start(): void {
        if (!chosenRow) return;
        select(chosenRow, withMapAvailable && chosenLayout !== "none" ? chosenLayout : undefined);
    }

    function kindLabel(row: RecordingSpaceRow): string {
        return row.kind === "megaphone"
            ? $LL.recording.actionbar.spacePicker.megaphone()
            : $LL.recording.actionbar.spacePicker.discussion();
    }

    function statusText(row: RecordingSpaceRow): string {
        switch (row.status) {
            case "starting":
                return `${$LL.recording.actionbar.title.start()}...`;
            case "stopping":
                return `${$LL.recording.actionbar.title.stop()}...`;
            case "recording-other":
                return row.recorderName
                    ? $LL.recording.notification.recordingStarted({ name: row.recorderName })
                    : $LL.notification.recordingStarted();
            default:
                return "";
        }
    }

    const legend = "mb-2 p-0 text-xs font-semibold uppercase tracking-wide text-white/70";
    const choice =
        "flex cursor-pointer items-center gap-3 rounded-lg border border-white/15 bg-white/5 p-3 has-[:checked]:border-secondary has-[:checked]:bg-secondary/20 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary";
</script>

<div
    role="dialog"
    data-testid="recording-space-picker"
    aria-labelledby="recording-picker-title"
    tabindex="-1"
    bind:this={root}
    onkeydown={onKeydown}
    class="focus:outline-none flex max-h-[80vh] w-[30rem] max-w-[calc(100vw-2rem)] flex-col gap-4 overflow-auto rounded-xl bg-contrast/95 p-5 text-white shadow-2xl backdrop-blur-md"
    use:clickOutside={() => handleClose()}
>
    <div class="flex items-center justify-between">
        <h2 id="recording-picker-title" class="m-0 text-xl font-bold">
            {$LL.recording.actionbar.spacePicker.title()}
        </h2>
        <button
            type="button"
            class="flex h-11 w-11 items-center justify-center rounded-lg text-white hover:bg-white/10"
            aria-label={$LL.recording.close()}
            onclick={() => handleClose(true)}
        >
            <IconX font-size="20" />
        </button>
    </div>

    {#each ownRows as row (row.spaceName)}
        <div class="flex flex-col gap-3" data-testid="recording-space-row-{row.kind}">
            <div class="flex items-center gap-2">
                <span
                    role="status"
                    class="flex h-11 items-center gap-2 rounded-lg bg-black/30 px-3 text-sm font-bold tracking-wide"
                    data-testid="recording-space-kind-{row.kind}"
                >
                    <span class="h-3 w-3 rounded-full bg-red-400 motion-safe:animate-pulse" aria-hidden="true"></span>
                    REC · {kindLabel(row)}
                </span>
                <button
                    type="button"
                    data-testid="recording-space-action-stop"
                    class="ms-auto flex h-11 items-center gap-2 rounded-lg bg-[#c8282f] px-4 text-sm font-semibold text-white hover:bg-[#b02028] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={row.disabled || row.status === "stopping"}
                    onclick={() => select(row)}
                >
                    <span class="h-3 w-3 rounded-sm bg-white" aria-hidden="true"></span>
                    {row.status === "stopping"
                        ? `${$LL.recording.actionbar.title.stop()}...`
                        : $LL.recording.actionbar.title.stop()}
                </button>
            </div>
            <RecordingProducerPanel space={row.space} />
        </div>
    {/each}

    {#if otherRows.length > 0}
        <fieldset class="m-0 flex flex-col gap-2 border-0 p-0">
            <legend class={legend}>{$LL.recording.actionbar.spacePicker.source()}</legend>
            {#each otherRows as row (row.spaceName)}
                {@const text = statusText(row)}
                <label class={choice} data-testid="recording-space-row-{row.kind}">
                    <input
                        type="radio"
                        name="recording-source"
                        class="m-0 h-[18px] w-[18px] accent-secondary"
                        value={row.spaceName}
                        checked={row === chosenRow}
                        disabled={row.action !== "start" || row.disabled}
                        onchange={() => (chosenSpaceName = row.spaceName)}
                    />
                    <span class="flex min-w-0 flex-col gap-0.5">
                        <span class="text-sm font-semibold" data-testid="recording-space-kind-{row.kind}"
                            >{kindLabel(row)}</span
                        >
                        {#if text}
                            <span class="text-xs text-white/70">{text}</span>
                        {/if}
                    </span>
                </label>
            {/each}
        </fieldset>
    {/if}

    {#if chosenRow}
        {#if withMapAvailable}
            <fieldset class="m-0 border-0 p-0">
                <legend class={legend}>{$LL.recording.actionbar.spacePicker.withMap()}</legend>
                <div class="grid grid-cols-4 gap-2">
                    {#each ["none" as const, ...RECORDER_LAYOUT_MODES] as layout (layout)}
                        <label
                            class="flex cursor-pointer flex-col gap-2 rounded-lg border border-white/15 bg-white/5 p-2 text-xs font-medium has-[:checked]:border-secondary has-[:checked]:bg-secondary/20 has-[:checked]:ring-1 has-[:checked]:ring-secondary has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-secondary"
                            data-testid="recording-space-layout-{layout}"
                        >
                            <input
                                type="radio"
                                name="recording-layout"
                                class="sr-only"
                                value={layout}
                                checked={chosenLayout === layout}
                                onchange={() => (chosenLayout = layout)}
                            />
                            <RecorderLayoutPreview mode={layout === "none" ? undefined : layout} cameraCount={4} />
                            {layout === "none"
                                ? $LL.recording.actionbar.spacePicker.camerasOnly()
                                : $LL.recording.actionbar.spacePicker.layout[layout]()}
                        </label>
                    {/each}
                </div>
                {#if chosenLayout === "none"}
                    <p
                        class="m-0 mt-2 rounded-lg bg-white/5 px-3 py-2 text-xs leading-relaxed text-white/85"
                        data-testid="recording-space-cameras-only-hint"
                    >
                        {$LL.recording.actionbar.spacePicker.camerasOnlyHint()}
                    </p>
                {/if}
            </fieldset>
        {/if}

        <div class="flex flex-col gap-3 border-t border-white/10 pt-3">
            <p class="m-0 text-xs leading-relaxed text-white/70">
                {$LL.recording.actionbar.desc.advert()}
                {$LL.recording.actionbar.spacePicker.savedHint()}
            </p>
            <button
                type="button"
                data-testid="recording-space-action-start"
                class="ms-auto flex h-11 items-center gap-2 rounded-lg bg-[#c8282f] px-5 text-sm font-semibold text-white hover:bg-[#b02028]"
                onclick={start}
            >
                <span class="h-3 w-3 rounded-full bg-white" aria-hidden="true"></span>
                {$LL.recording.actionbar.title.start()}
            </button>
        </div>
    {/if}
</div>
