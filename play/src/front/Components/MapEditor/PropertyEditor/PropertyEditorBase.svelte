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
    <div class="content tw-p-2">
        <slot name="content">No content</slot>
    </div>
</div>

<style lang="scss">
    .property-settings-container {
        border-radius: 5px;
        padding: 5px;

        .header {
            display: flex;
            font-size: 25px;
            flex-direction: row;
            justify-content: space-between;
            align-items: center;
        }

        .content {
            border-left-width: 1px;
            border-left-style: solid;
            --tw-border-opacity: 1;
            border-color: rgb(77 75 103 / var(--tw-border-opacity));
        }
    }
</style>
