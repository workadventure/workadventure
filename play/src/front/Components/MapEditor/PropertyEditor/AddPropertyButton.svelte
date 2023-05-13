<script>
    import { createEventDispatcher } from "svelte";
    import plusImg from "../../images/plus.svg";

    export let headerText;
    //export let descriptionText;

    const dispatch = createEventDispatcher();
</script>

<button
    class="add-property-button tw-p-4"
    on:click={() => {
        dispatch("click");
    }}
>
    <div class="header">
        {headerText}
        <img src={plusImg} alt="" />
    </div>
    <!-- TODO add description
        <div class="description">
            {descriptionText}
        </div>
    -->
</button>

<style lang="scss">
    .add-property-button {
        --tw-border-opacity: 1;
        border-color: rgb(77 75 103 / var(--tw-border-opacity));
        --tw-bg-opacity: 1;
        background-color: rgb(27 27 41 / var(--tw-bg-opacity));
        --tw-text-opacity: 1;
        color: gray;
        width: 100%;
        border-radius: 10px;
        position: relative;
        display: flex;
        flex-grow: 1;
        flex-direction: column;
        .header {
            color: white;
            width: 100%;
            display: flex;
            justify-content: space-between;
            img {
                object-fit: contain;
                max-width: 2em;
                max-height: 2em;
            }
        }
        .description {
            color: gray;
            width: 100%;
            font-size: 15px;
            color: #918ebb;
            text-align: left;
        }
    }
</style>
