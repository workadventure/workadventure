<script>
    import { createEventDispatcher, onDestroy } from "svelte";
    import { inputFormFocusStore } from "../../../Stores/UserInputStore";
    import CloseButton from "./CloseButton.svelte";

    const dispatch = createEventDispatcher();

    onDestroy(() => {
        inputFormFocusStore.set(false);
    });
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
