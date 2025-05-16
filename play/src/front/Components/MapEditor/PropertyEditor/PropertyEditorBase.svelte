<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import { inputFormFocusStore } from "../../../Stores/UserInputStore";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    onDestroy(() => {
        inputFormFocusStore.set(false);
    });
</script>

<div class="property-settings-container">
    <div class="header relative font-bold flex items-center justify-between px-2">
        <slot name="header">_MISSING_</slot>
        <ButtonClose
            on:click={() => {
                dispatch("close");
            }}
            bgColor="bg-white/20"
            hoverColor="bg-white/30"
            size="xs"
        />
    </div>
    <div class="content p-2">
        <slot name="content">No content</slot>
    </div>
</div>
