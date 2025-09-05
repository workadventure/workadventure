<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import { inputFormFocusStore } from "../../../Stores/UserInputStore";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconInfoCircle } from "@wa-icons";
    const dispatch = createEventDispatcher<{
        close: void;
    }>();

    onDestroy(() => {
        // Firefox does not trigger the "blur" event when the input is removed from the DOM.
        // So we need to manually set the focus to false when the component is destroyed.
        
        // Explicitly blur any focused element to ensure Firefox properly releases focus
        if (document.activeElement && document.activeElement !== document.body) {
            const activeEl = document.activeElement as HTMLElement;
            if (typeof activeEl.blur === 'function') {
                activeEl.blur();
            }
        }
        
        inputFormFocusStore.set(false);
    });
</script>

<div class="property-settings-container">
    <div class="header relative font-bold flex items-center flex-col gap-2 px-3">
        <div class="flex items-center justify-between w-full">
            <slot name="header">_MISSING_</slot>
            <ButtonClose
                on:click={() => {
                    dispatch("close");
                }}
                bgColor="bg-white/20"
                hoverColor="bg-white/30"
                size="sm"
            />
        </div>
        <span class="w-full bg-white/10 h-[1px] my-3" />
    </div>
    <div class="content">
        <slot name="content">
            <p class="help-text">
                <IconInfoCircle font-size="18" />
                {$LL.mapEditor.properties.noProperties()}
            </p>
        </slot>
    </div>
</div>
