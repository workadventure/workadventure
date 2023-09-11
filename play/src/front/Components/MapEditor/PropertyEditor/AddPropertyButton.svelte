<script>
    import { createEventDispatcher } from "svelte";

    export let headerText;
    export let descriptionText;
    export let img;
    export let style;
    export let disabled = false;

    const dispatch = createEventDispatcher();
</script>

<button
    class="add-property-button tooltip p-4 flex justify-center items-center"
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
