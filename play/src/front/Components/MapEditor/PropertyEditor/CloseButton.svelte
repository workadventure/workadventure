<script>
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher();
</script>

<button
    class="close-button"
    on:click={() => {
        dispatch("click");
    }}
>
    x
</button>

<style lang="scss">
    .close-button {
        float: right;
        padding: 3px;
        border-radius: 8px;
        cursor: pointer;
    }
</style>
