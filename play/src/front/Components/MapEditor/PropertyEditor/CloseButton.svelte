<script lang="ts">
    import { createEventDispatcher } from "svelte";

    const dispatch = createEventDispatcher<{
        click: undefined;
    }>();
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
        position: absolute;
        padding: 3px;
        border-radius: 8px;
        top: 0;
        inset-inline-end: 0;
        cursor: pointer;
    }
</style>
