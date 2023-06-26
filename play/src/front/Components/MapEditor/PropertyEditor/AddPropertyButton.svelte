<script>
    import { createEventDispatcher } from "svelte";

    export let headerText;
    export let descriptionText;
    export let img;
    export let style;

    const dispatch = createEventDispatcher();
</script>

<button
    class="add-property-button tooltip tw-p-4 tw-flex tw-justify-center tw-items-center"
    {style}
    on:click={() => {
        dispatch("click");
    }}
>
    <div class="tw-w-10 tw-h-10 tw-flex tw-flex-wrap tw-items-center tw-justify-center">
        <img draggable="false" class="tw-max-w-[75%] tw-max-h-[75%]" src={img} alt="info icon" />
    </div>
    <span class="tooltiptext tw-text-xs">
        <p class="tw-text-sm tw-mb-2">{headerText}</p>
        {descriptionText}
    </span>
</button>

<style lang="scss">
    .add-property-button {
        --tw-border-opacity: 1;
        border-color: rgb(77 75 103 / var(--tw-border-opacity));
        --tw-bg-opacity: 1;
        background-color: rgb(27 27 41 / var(--tw-bg-opacity));
        --tw-text-opacity: 1;
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
</style>
