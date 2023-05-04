<script>
    import { createEventDispatcher } from "svelte";
    import CloseButton from "./CloseButton.svelte";

    const dispatch = createEventDispatcher();
</script>

<div class="property-settings-container">
    <div class="header">
        <slot name="header">_MISSING_</slot>
        <CloseButton
            on:click={() => {
                dispatch("close");
            }}
        />
    </div>
    <slot name="content" />
</div>

<style lang="scss">
    .header {
        display: flex;
        font-size: 25px;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
    }
    .property-settings-container {
        border: 1px solid grey;
        border-radius: 5px;
        padding: 5px;
    }
</style>
