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
    {#if typeof img !== "string"}
        <svelte:component this={img} class="tw-w-10 tw-h-9 tw-text-white" />
    {:else}
        <img draggable="false" class="tw-w-10" src={img} alt="info icon" />
    {/if}
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
