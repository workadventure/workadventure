<script>
    import { createEventDispatcher } from "svelte";

    export let headerText;
    export let descriptionText;
    export let img;
    export let style;
    export let disabled = false;
    export let testId = undefined;
    const dispatch = createEventDispatcher();
</script>

<button
    class="add-property-button tooltip p-4 flex justify-center items-center"
    data-testid={testId}
    {style}
    on:click={() => {
        if (disabled) return;
        dispatch("click");
    }}
    {disabled}
>
    <div class="w-10 h-10 flex flex-wrap items-center justify-center" style={disabled ? `opacity: 0.5;` : ""}>
        <img draggable="false" class="max-w-[75%] max-h-[75%]" src={img} alt="info icon" />
    </div>
    <span class="tooltiptext text-xs">
        <p class="text-sm mb-2">{headerText}</p>
        {descriptionText}
    </span>
</button>

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
        border-radius: 0.25rem;
        --tw-bg-opacity: 1;
        background-color: rgb(56 56 74 / var(--tw-bg-opacity));
        padding: 1.25rem 0.75rem;
        text-align: center;
        --tw-text-opacity: 1;
        color: rgb(255 255 255 / var(--tw-text-opacity));
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
        --border-opacity: 1;
        border-color: rgb(77 75 103 / var(--border-opacity));
        --bg-opacity: 1;
        background-color: rgb(27 27 41 / var(--bg-opacity));
        --text-opacity: 1;
        color: gray;
        border-radius: 10px;
        position: relative;
        display: flex;
        flex-direction: column;
        margin: 0.25rem 0.125rem;

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
