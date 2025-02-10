<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { Action } from "svelte/action";
    import HelpTooltip from "../Tooltip/HelpTooltip.svelte";
    import { helpTextDisabledStore } from "../../Stores/MenuStore";

    export let tooltipTitle = "";
    export let tooltipDesc = "";
    export let disabledHelp = false;
    export let state: "normal" | "active" | "forbidden" | "disabled" = "normal";
    export let dataTestId: string | undefined = undefined;
    export let classList = "group";
    // An optional action that will be added to the button element.
    export let action: Action = () => {};

    let helpActive = false;

    const dispatch = createEventDispatcher();

    function handleClick() {
        if (state === "disabled") {
            return;
        }
        dispatch("click");
    }
</script>

<div
    class="{classList} relative bg-contrast/80 transition-all backdrop-blur first:rounded-l-lg last:rounded-r-lg py-2 first:pl-2 last:pr-2 pl-1 pr-1 aspect-square pointer-events-auto"
>
    <button
        use:action
        type="button"
        class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 rounded
                {state === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                {state === 'normal' ? 'hover:bg-white/10 cursor-pointer' : ''}
                {state === 'active' ? 'bg-secondary hover:bg-secondary-600 cursor-pointer' : ''}
                {state === 'forbidden' ? 'bg-danger hover:bg-danger-600 cursor-pointer' : ''}
                flex items-center justify-center transition-all outline-none focus:outline-none"
        disabled={state === "disabled"}
        on:click|preventDefault={() => handleClick()}
        on:mouseenter={() => {
            helpActive = true;
        }}
        on:mouseleave={() => {
            helpActive = false;
        }}
        data-testid={dataTestId}
    >
        <slot />
    </button>
    {#if helpActive && !$helpTextDisabledStore && !disabledHelp && (tooltipTitle || tooltipDesc)}
        <HelpTooltip title={tooltipTitle} desc={tooltipDesc} />
    {/if}
</div>
