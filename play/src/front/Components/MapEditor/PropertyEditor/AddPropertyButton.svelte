<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fade } from "svelte/transition";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";

    export let headerText: string | undefined;
    export let descriptionText: string | undefined;
    export let img: string | undefined;
    export let style: string | undefined;
    export let disabled = false;
    export let testId: string | undefined;
    const dispatch = createEventDispatcher<{
        change: undefined;
        close: undefined;
        click: undefined;
    }>();

    let isHovered = false;

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom",
        },
        12
    );

    let hoverTimeout: ReturnType<typeof setTimeout> | undefined;

    function onMouseEnter() {
        hoverTimeout = setTimeout(() => {
            isHovered = true;
        }, 400);
    }

    function onMouseLeave() {
        isHovered = false;
        if (hoverTimeout) {
            clearTimeout(hoverTimeout);
            hoverTimeout = undefined;
        }
    }
</script>

<button
    on:mouseenter={onMouseEnter}
    on:mouseleave={onMouseLeave}
    class="add-property-button tooltip p-3 flex justify-center items-center
    border border-solid border-white/25 text-gray-500 rounded-lg relative  flex-col m-[0.25rem_0.125rem]"
    use:floatingUiRef
    data-testid={testId}
    {style}
    on:click={() => {
        if (disabled) return;
        dispatch("click");
    }}
    {disabled}
>
    <div class="w-8 h-8 flex flex-wrap items-center justify-center" style={disabled ? `opacity: 0.5;` : ""}>
        <img draggable="false" class="max-w-[75%] max-h-[75%]" src={img} alt="info icon" />
    </div>
</button>

{#if isHovered}
    <div
        class="tooltiptext z-[310] p-2 absolute text-xs bg-contrast backdrop-blur rounded-md text-white max-w-full"
        use:floatingUiContent
        transition:fade={{ duration: 200 }}
    >
        <div use:arrowAction />
        <p class="text-sm m-0 font-semibold">{headerText}</p>
        {descriptionText}
    </div>
{/if}

<style lang="scss">
    .tooltip {
        position: relative;
        display: inline-block;
    }

    .tooltip .tooltiptext {
        visibility: hidden;
        position: absolute;
        bottom: 100%;
        align-items: center;
        padding: 1.25rem 0.75rem;
        text-align: center;
    }

    .tooltip:hover .tooltiptext {
        visibility: visible;
    }

    .tooltip .tooltiptext:after {
        content: "";
        position: absolute;
        top: 100%;
        left: 2.5rem;
        border-style: solid;
        margin-left: -5px;
        border-width: 5px;
        border-color: #38384a transparent transparent transparent;
    }

    .add-property-button {
        display: flex;
        .tooltiptext {
            top: 100%;
            bottom: 0;
            padding: 0.5rem 0.25rem;
            height: fit-content;

            &::after {
                bottom: 100%;
                top: auto;
                transform: rotate(180deg);
            }
        }
    }

    button:disabled {
        pointer-events: all;
        cursor: default;

        div {
            cursor: default;
        }

        img {
            opacity: 0.5;
            cursor: default;
        }

        .tooltiptext {
            cursor: default;
        }
    }
</style>
