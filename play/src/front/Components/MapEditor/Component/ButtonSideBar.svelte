<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { createPopperActions } from "svelte-popperjs";
    import { LocalizedString } from "typesafe-i18n";
    import { EditorToolName } from "../../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore } from "../../../Stores/MapEditorStore";

    export let tool: { toolName: EditorToolName; img: string; tooltiptext: LocalizedString };

    $: activeTooltip = false;

    const [popperRef, popperContent] = createPopperActions({
        placement: "left",
    });

    const extraOpts = {
        modifiers: [
            { name: "offset", options: { offset: [0, 18] } },
            {
                name: "popper-arrow",
                options: {
                    element: ".popper-arrow",
                    padding: 12,
                },
            },
        ],
    };

    const dispatch = createEventDispatcher();
</script>

<div
    class="tool-button"
    use:popperRef
    on:mouseenter={() => (activeTooltip = true)}
    on:mouseleave={() => (activeTooltip = false)}
>
    <button
        class="p-3 aspect-square w-12 rounded {$mapEditorSelectedToolStore === tool.toolName
            ? 'bg-secondary'
            : 'hover:bg-white/10'}"
        id={tool.toolName}
        class:active={$mapEditorSelectedToolStore === tool.toolName}
        on:click|preventDefault={() => dispatch("click")}
        type="button"
    >
        <img class="h-6 w-6" src={tool.img} alt="open tool {tool.toolName}" />
    </button>
    {#if activeTooltip}
        <div
            use:popperContent={extraOpts}
            class="tooltip popper-tooltip bg-contrast/80 backdrop-blur rounded p-2 text-white text-sm text-nowrap"
        >
            <div class="popper-arrow !top-[30%] !-translate-x-1/2" data-popper-arrow />
            {tool.tooltiptext}
        </div>
    {/if}
</div>

<style lang="scss">
    .tooltip {
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
    }

    .tooltip.popper-tooltip {
        animation: fadeIn 0.3s forwards;
    }

    @keyframes fadeIn {
        from {
            opacity: 0;
        }
        to {
            opacity: 1;
        }
    }

    .popper-tooltip[data-popper-placement^="left"] .popper-arrow {
        top: 50%;
        transform: translateY(-50%);
    }
</style>
