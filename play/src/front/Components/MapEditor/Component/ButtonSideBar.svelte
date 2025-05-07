<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { LocalizedString } from "typesafe-i18n";
    import { EditorToolName } from "../../../Phaser/Game/MapEditor/MapEditorModeManager";
    import { mapEditorSelectedToolStore } from "../../../Stores/MapEditorStore";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";

    export let tool: { toolName: EditorToolName; img: string; tooltiptext: LocalizedString };

    let activeTooltip = false;

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "left",
            //strategy: 'fixed',
        },
        16
    );

    const dispatch = createEventDispatcher<{
        click: void;
    }>();
</script>

<div
    class="tool-button"
    use:floatingUiRef
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
            use:floatingUiContent
            class="absolute tooltip bg-contrast/80 backdrop-blur rounded p-2 text-white text-sm text-nowrap"
        >
            <div class="!top-[30%] !-translate-x-1/2" use:arrowAction />
            {tool.tooltiptext}
        </div>
    {/if}
</div>

<style lang="scss">
    .tooltip {
        opacity: 0;
        transition: opacity 0.3s ease-in-out;
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
</style>
