<script lang="ts">
    import { createEventDispatcher, getContext } from "svelte";
    import { Action } from "svelte/action";
    import HelpTooltip from "../Tooltip/HelpTooltip.svelte";
    import { helpTextDisabledStore } from "../../Stores/MenuStore";

    export let label: string | undefined = undefined;
    export let tooltipTitle = "";
    export let tooltipDesc = "";
    export let disabledHelp = false;
    export let state: "normal" | "active" | "forbidden" | "disabled" = "normal";
    export let dataTestId: string | undefined = undefined;
    export let classList = "group";
    // Hide the icon in the action bar (displays only the label), and only displays the icon if we are in the responsive menu.
    export let hideIconInActionBar = false;
    // An optional action that will be added to the button element.
    export let bgColor: string | undefined = undefined;
    export let textColor: string | undefined = undefined;
    export let isGradient = false;
    export let hasImage = true;
    export let action: Action = () => {};

    // By default, the button will have a rounded corner on the left if it is the first of a div.
    // This behaviour can be overridden by setting the "first" prop to true or false explicitly.
    // Used for the responsive menu items.
    export let first: boolean | undefined = undefined;
    // By default, the button will have a rounded corner on the right if it is the last of a div.
    // This behaviour can be overridden by setting the "last" prop to true or false explicitly.
    // Used for the responsive menu items.
    export let last: boolean | undefined = undefined;
    // Can be used to force the context. If not set, the context is deduced from the "inMenu" Svelte context.
    export let context: "actionBar" | "menu" | undefined = undefined;

    $: isInMenu = context !== undefined ? context === "menu" : getContext("inMenu");

    let helpActive = false;

    const dispatch = createEventDispatcher();

    function handleClick() {
        if (state === "disabled") {
            return;
        }
        dispatch("click");
    }

    $: styleVars = [bgColor ? `--bg-color: ${bgColor};` : "", textColor ? `--text-color: ${textColor};` : ""]
        .filter(Boolean)
        .join(" ");
</script>

{#if !isInMenu}
    <div
        class="relative bg-contrast/80 backdrop-blur py-2 pl-1 pr-1 pointer-events-auto {classList} group-[.invisible]/visibilitychecker:px-2"
        class:first:rounded-l-lg={first === undefined}
        class:first:pl-2={first === undefined}
        class:last:rounded-r-lg={last === undefined}
        class:last:pr-2={last === undefined}
        class:rounded-l-lg={first === true}
        class:pl-2={first === true}
        class:rounded-r-lg={last === true}
        class:pr-2={last === true}
        use:action
        style={styleVars}
    >
        <button
            type="button"
            class="h-12 @sm/actions:h-10 @xl/actions:h-12 p-1 m-0 rounded relative
                    {state === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                    {state === 'normal' && !isGradient ? 'hover:bg-white/10 cursor-pointer' : ''}
                    {state === 'active' ? 'bg-secondary hover:bg-secondary-600 cursor-pointer' : ''}
                    {state === 'forbidden' ? 'bg-danger hover:bg-danger-600 cursor-pointer' : ''}
                    {!label
                ? 'w-12 @sm/actions:w-10 @xl/actions:w-12'
                : 'px-4 text-base @sm/actions:text-sm @xl/actions:text-base whitespace-nowrap'}
                {isGradient ? 'gradient overflow-hidden font-bold' : ''}
                {bgColor && !isGradient ? 'bg-[var(--bg-color)]' : ''}
                {textColor ? 'text-[var(--text-color)]' : 'text-neutral-100'}
                    flex items-center justify-center outline-none focus:outline-none gap-2 select-none"
            disabled={state === "disabled"}
            on:click|preventDefault={() => handleClick()}
            on:mouseenter={() => {
                helpActive = true;
                dispatch("mouseenter");
            }}
            on:mouseleave={() => {
                helpActive = false;
                dispatch("mouseleave");
            }}
            data-testid={dataTestId}
        >
            {#if !hideIconInActionBar}
                <slot />
            {/if}
            {#if label}<span>{label}</span>{/if}
        </button>
        {#if helpActive && !$helpTextDisabledStore && !disabledHelp && (tooltipTitle || tooltipDesc)}
            <HelpTooltip title={tooltipTitle} desc={tooltipDesc} />
        {/if}
    </div>
{:else}
    <button
        class="group flex p-2 gap-2 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm text-neutral-100 w-full pointer-events-auto text-left rounded select-none
                    {state === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                    {state === 'active' && !isGradient ? 'bg-secondary hover:bg-secondary-600 cursor-pointer' : ''}
                    {state === 'forbidden' ? 'bg-danger hover:bg-danger-600 cursor-pointer' : ''}
                    {isGradient ? 'gradient overflow-hidden' : ''}
                    {bgColor && !isGradient ? 'bg-[var(--bg-color)]' : ''}
                    {textColor ? 'text-[var(--text-color)]' : 'text-neutral-100'}
                    {isGradient ? 'justify-center relative' : ''}"
        use:action
        on:click={() => handleClick()}
        style={styleVars}
    >
        {#if hasImage}
            <div class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center">
                <slot />
            </div>
        {/if}
        <div class="text-left h-6 leading-4 flex items-center text-nowrap">
            {label ?? tooltipTitle ?? ""}
            <slot name="end" />
        </div>
    </button>
{/if}

<style>
    .gradient:before {
        content: "";
        z-index: -1;
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 200%;
        border-radius: 100%;
        filter: blur(20px);
        /*background-color: #cdb012;*/
        background-color: var(--bg-color);
        opacity: 0.7;
        transition: all 0.5s ease-in-out;
    }

    .gradient:hover:before {
        opacity: 1;
        border-radius: 10%;
    }

    .gradient {
        border: 1px solid rgb(from var(--bg-color) r g b / 0.3);
        transition: all 0.2s ease-in-out;
        box-shadow: 0px 0px 0px 0px var(--bg-color) / 0;
    }

    .gradient:hover {
        box-shadow: 0px 0px 4px 2px rgb(from var(--bg-color) r g b / 0.1);
    }
</style>
