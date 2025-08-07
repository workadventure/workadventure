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
        inputFormFocusStore.set(false);
    });
</script>

<div class="property-settings-container">
    <div class="header relative font-bold flex items-center justify-between px-3">
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
    <div class="content">
        <slot name="content">
            <p class="help-text">
                <IconInfoCircle font-size="18" />
                {$LL.mapEditor.properties.noProperties()}
            </p>
        </slot>
    </div>
</div>
