<script lang="ts">
    import type { Snippet } from "svelte";
    import { onDestroy } from "svelte";
    import { inputFormFocusStore } from "../../../Stores/UserInputStore";
    import ButtonClose from "../../Input/ButtonClose.svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { IconInfoCircle } from "@wa-icons";

    interface Props {
        onclose?: () => void;
        onkeypress?: (event: KeyboardEvent) => void;
        header?: Snippet;
        content?: Snippet;
    }

    let { onclose, onkeypress, header, content }: Props = $props();

    onDestroy(() => {
        inputFormFocusStore.set(false);
    });
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<div class="property-settings-container" role="group" {onkeypress}>
    <div class="header relative font-bold flex items-center flex-col gap-2 px-3">
        <div class="flex items-center justify-between w-full">
            {#if header}
                {@render header()}
            {:else}
                _MISSING_
            {/if}
            <ButtonClose
                onclick={() => {
                    onclose?.();
                }}
                bgColor="bg-white/20"
                hoverColor="bg-white/30"
                size="sm"
            />
        </div>
        <span class="w-full bg-white/10 h-[1px] my-3"></span>
    </div>
    <div class="content">
        {#if content}
            {@render content()}
        {:else}
            <p class="help-text">
                <IconInfoCircle font-size="18" />
                {$LL.mapEditor.properties.noProperties()}
            </p>
        {/if}
    </div>
</div>
