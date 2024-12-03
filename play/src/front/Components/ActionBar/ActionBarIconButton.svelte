<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import HelpTooltip from "../Tooltip/HelpTooltip.svelte";
    import { helpTextDisabledStore } from "../../Stores/MenuStore";

    export let tooltipTitle = "";
    export let tooltipDesc = "";
    export let disabledHelp = false;
    export let state: "normal" | "active" | "forbidden" | "disabled" = "normal";

    let helpActive = false;

    const dispatch = createEventDispatcher();

    function handleClick() {
        if (state === "disabled") {
            return;
        }
        dispatch("click");
    }

    $: console.log("state", state);
</script>

<!-- svelte-ignore a11y-click-events-have-key-events -->
<div
    class="h-12 w-12 @sm/actions:h-10 @sm/actions:w-10 @xl/actions:h-12 @xl/actions:w-12 p-1 m-0 rounded
            {state === 'disabled' ? 'opacity/50 cursor-not-allowed' : ''}
            {state === 'normal' ? 'hover:bg-white/10 cursor-pointer' : ''}
            {state === 'active' ? 'bg-secondary hover:bg-danger cursor-pointer' : ''}
            {state === 'forbidden' ? 'bg-danger hover:bg-danger-600 cursor-pointer' : ''}
            flex items-center justify-center transition-all"
    on:click={() => handleClick()}
    on:mouseenter={() => {
        helpActive = true;
    }}
    on:mouseleave={() => {
        helpActive = false;
    }}
>
    <slot />
</div>
{#if helpActive && !helpTextDisabledStore && !disabledHelp}
    <HelpTooltip title={tooltipTitle} desc={tooltipDesc} />
{/if}
