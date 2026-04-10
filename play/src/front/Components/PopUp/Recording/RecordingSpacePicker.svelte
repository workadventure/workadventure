<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { clickOutside } from "svelte-outside";
    import { LL } from "../../../../i18n/i18n-svelte";
    import type { SpaceInterface } from "../../../Space/SpaceInterface";

    export let spaces: SpaceInterface[] = [];
    export let onSelect: (space: SpaceInterface) => void;
    export let onClose: (() => void) | undefined = undefined;

    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    function isMegaphoneSpace(space: SpaceInterface): boolean {
        return space.getMetadata().get("isMegaphoneSpace") === true;
    }

    function handleClose(): void {
        dispatch("close");
        onClose?.();
    }

    function handleSelect(space: SpaceInterface): void {
        onSelect(space);
        handleClose();
    }
</script>

<div
    data-testid="recording-space-picker"
    class="bg-contrast/80 backdrop-blur-md rounded-md shadow-lg p-2 max-w-96 overflow-auto flex flex-col gap-1"
    use:clickOutside={handleClose}
>
    {#each spaces as space, index (space.getName())}
        <button
            type="button"
            class="w-full text-left p-2 rounded hover:bg-white/10 transition-colors flex flex-col gap-1"
            data-testid="recording-space-option-{index}"
            on:click={() => handleSelect(space)}
        >
            <span class="text-sm font-semibold text-white">
                {isMegaphoneSpace(space)
                    ? $LL.recording.actionbar.spacePicker.megaphone()
                    : $LL.recording.actionbar.spacePicker.discussion()}
            </span>
        </button>
    {/each}
</div>
