<script lang="ts">
    import type { Snippet } from "svelte";
    import { getContext } from "svelte";
    import type { Action } from "svelte/action";
    import HelpTooltip from "../Tooltip/HelpTooltip.svelte";
    import { helpTextDisabledStore } from "../../Stores/MenuStore";

    interface Props {
        label?: string;
        tooltipTitle?: string;
        tooltipDesc?: string;
        disabledHelp?: boolean;
        tooltipDelay?: number;
        state?: "normal" | "active" | "forbidden" | "disabled" | "disabledForbidden";
        dataTestId?: string;
        classList?: string;
        hideIconInActionBar?: boolean;
        bgColor?: string;
        textColor?: string;
        isGradient?: boolean;
        hasImage?: boolean;
        action?: Action;
        onclick?: (event: MouseEvent) => void;
        onkeydown?: (event: KeyboardEvent) => void;
        onmouseenter?: (event: MouseEvent) => void;
        onmouseleave?: (event: MouseEvent) => void;
        media?: string;
        desc?: string;
        tooltipShortcuts?: string[];
        boldLabel?: boolean;
        wrapperDiv?: HTMLElement;
        // By default, the button will have a rounded corner on the left if it is the first of a div.
        // This behaviour can be overridden by setting the "first" prop to true or false explicitly.
        // Used for the responsive menu items.
        first?: boolean;
        // By default, the button will have a rounded corner on the right if it is the last of a div.
        // This behaviour can be overridden by setting the "last" prop to true or false explicitly.
        // Used for the responsive menu items.
        last?: boolean;
        // Can be used to force the context. If not set, the context is deduced from the "inMenu" Svelte context.
        context?: "actionBar" | "menu";
        children?: Snippet;
        tooltip?: Snippet;
        end?: Snippet;
    }

    let {
        label = undefined,
        tooltipTitle = "",
        tooltipDesc = "",
        disabledHelp = false,
        tooltipDelay = 500,
        state: buttonState = "normal",
        dataTestId = undefined,
        classList = "group",
        hideIconInActionBar = false,
        bgColor = undefined,
        textColor = undefined,
        isGradient = false,
        hasImage = true,
        action = () => {},
        onclick = undefined,
        onkeydown = undefined,
        onmouseenter = undefined,
        onmouseleave = undefined,
        media = "",
        desc = "",
        tooltipShortcuts = [],
        boldLabel = false,
        wrapperDiv = $bindable(),
        first = undefined,
        last = undefined,
        context = undefined,
        children,
        tooltip,
        end,
    }: Props = $props();

    let isInMenu = $derived(context !== undefined ? context === "menu" : getContext("inMenu"));

    let helpActive = $state(false);

    function handleClick(event: MouseEvent) {
        if (buttonState === "disabled" || buttonState === "disabledForbidden") {
            return;
        }
        helpActive = false;
        onclick?.(event);
    }

    let styleVars = $derived(
        [bgColor ? `--bg-color: ${bgColor};` : "", textColor ? `--text-color: ${textColor};` : ""]
            .filter(Boolean)
            .join(" "),
    );
</script>

{#if !isInMenu}
    <div
        class={[
            "relative bg-contrast/80 backdrop-blur py-2 ps-1 pe-1 pointer-events-auto group-[.invisible]/visibilitychecker:px-2",
            classList,
            {
                "first-of-type:rounded-s-lg first-of-type:ps-2": first === undefined,
                "last-of-type:rounded-e-lg last-of-type:pe-2": last === undefined,
                "rounded-s-lg ps-2": first === true,
                "rounded-e-lg pe-2": last === true,
            },
        ]}
        use:action
        style={styleVars}
        bind:this={wrapperDiv}
    >
        <button
            type="button"
            class="h-12 @sm/actions:h-10 @xl/actions:h-12 p-1 m-0 rounded relative
                    {buttonState === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                    {buttonState === 'disabledForbidden' ? 'bg-danger opacity-70 cursor-not-allowed' : ''}
                    {buttonState === 'normal' && !isGradient ? 'hover:bg-white/10 cursor-pointer' : ''}
                    {buttonState === 'active' ? 'bg-secondary hover:bg-secondary-600 cursor-pointer' : ''}
                    {buttonState === 'forbidden' ? 'bg-danger hover:bg-danger-600 cursor-pointer' : ''}
                    {!label
                ? 'w-12 @sm/actions:w-10 @xl/actions:w-12'
                : 'px-4 text-base @sm/actions:text-sm @xl/actions:text-base whitespace-nowrap'}
                {isGradient ? 'gradient overflow-hidden font-bold' : ''}
                {bgColor && !isGradient ? 'bg-[var(--bg-color)]' : ''}
                {textColor ? 'text-[var(--text-color)]' : 'text-neutral-100'}
                    flex items-center justify-center outline-none focus:outline-none gap-2 select-none"
            disabled={buttonState === "disabled" || buttonState === "disabledForbidden"}
            onclick={(event) => {
                event.preventDefault();
                handleClick(event);
            }}
            {onkeydown}
            onmouseenter={(event) => {
                helpActive = true;
                onmouseenter?.(event);
            }}
            onmouseleave={(event) => {
                helpActive = false;
                onmouseleave?.(event);
            }}
            data-testid={dataTestId}
        >
            {#if !hideIconInActionBar}
                {@render children?.()}
            {/if}
            {#if label}<span class={boldLabel ? "font-bold" : ""}>{label}</span>{/if}
        </button>
        {#if helpActive && !$helpTextDisabledStore && !disabledHelp && (tooltipTitle || tooltipDesc || tooltip)}
            <HelpTooltip
                title={tooltipTitle}
                helpMedia={media}
                {desc}
                shortcuts={tooltipShortcuts}
                delayBeforeAppear={tooltipDelay}
            >
                {@render tooltip?.()}
            </HelpTooltip>
        {/if}
    </div>
{:else}
    <button
        class="group flex p-2 gap-2 mb-1 items-center hover:bg-white/10 transition-all cursor-pointer font-bold text-sm text-neutral-100 w-full pointer-events-auto text-start rounded select-none
                    {buttonState === 'disabled' ? 'opacity-50 cursor-not-allowed' : ''}
                    {buttonState === 'disabledForbidden' ? 'bg-danger opacity-70 cursor-not-allowed' : ''}
                    {buttonState === 'active' && !isGradient
            ? 'bg-secondary hover:bg-secondary-600 cursor-pointer'
            : ''}
                    {buttonState === 'forbidden' ? 'bg-danger hover:bg-danger-600 cursor-pointer' : ''}
                    {isGradient ? 'gradient overflow-hidden' : ''}
                    {bgColor && !isGradient ? 'bg-[var(--bg-color)]' : ''}
                    {textColor ? 'text-[var(--text-color)]' : 'text-neutral-100'}
                    {isGradient ? 'relative' : ''}"
        use:action
        onclick={handleClick}
        {onkeydown}
        {onmouseenter}
        {onmouseleave}
        style={styleVars}
        data-testid={dataTestId}
        bind:this={wrapperDiv}
    >
        {#if hasImage}
            <div class="transition-all w-6 h-6 aspect-square text-center flex items-center justify-center">
                {@render children?.()}
            </div>
        {/if}
        <div class="text-start h-6 leading-4 flex items-center text-nowrap">
            {label ?? tooltipTitle ?? ""}
            {@render end?.()}
        </div>
    </button>
{/if}

<style>
    .gradient:before {
        content: "";
        z-index: -1;
        position: absolute;
        top: 0;
        inset-inline-start: 0;
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
