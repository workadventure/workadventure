<script lang="ts">
    import { fade } from "svelte/transition";
    import type { WorkAdventureComponent } from "../../../../types/component";
    import { createFloatingUiActions } from "../../../Utils/svelte-floatingui";

    interface Props {
        headerText?: string;
        descriptionText?: string;
        img?: string | WorkAdventureComponent;
        style?: string;
        disabled?: boolean;
        onclick?: (event: MouseEvent) => void;
        testId?: string;
    }

    let { headerText, descriptionText, img, style, disabled = false, onclick, testId }: Props = $props();

    let isHovered = $state(false);

    const [floatingUiRef, floatingUiContent, arrowAction] = createFloatingUiActions(
        {
            placement: "bottom",
        },
        12,
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
    onmouseenter={onMouseEnter}
    onmouseleave={onMouseLeave}
    class="add-property-button tooltip p-3 flex justify-center items-center
    border border-solid border-white/25 text-gray-500 rounded-lg relative flex-col m-[0.25rem_0.125rem]"
    use:floatingUiRef
    data-testid={testId}
    {style}
    onclick={(event) => {
        if (disabled) return;
        onclick?.(event);
    }}
    {disabled}
>
    <div class="w-8 h-8 flex flex-wrap items-center justify-center" style={disabled ? `opacity: 0.5;` : ""}>
        {#if typeof img === "string"}
            <img draggable="false" class="max-w-[75%] max-h-[75%]" src={img} alt="info icon" />
        {:else if img !== undefined}
            {@const Image = img}
            <Image class="text-white" font-size="20" />
        {/if}
    </div>
</button>

{#if isHovered}
    <div
        class="tooltiptext z-[310] p-2 absolute text-xs bg-contrast backdrop-blur rounded-md text-white max-w-full"
        use:floatingUiContent
        transition:fade={{ duration: 200 }}
    >
        <div use:arrowAction></div>
        <p class="text-sm m-0 font-semibold">{headerText}</p>
        {descriptionText}
    </div>
{/if}

<style>
    .tooltip {
        position: relative;
        display: inline-block;
    }

    .add-property-button {
        display: flex;
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
    }
</style>
