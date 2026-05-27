<script lang="ts">
    import type { Snippet } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import InfoButton from "./InfoButton.svelte";

    interface Props {
        id?: string;
        label: string;
        placeHolder?: string;
        onchange?: () => void;
        disabled?: boolean;
        value?: string | null;
        onfocus?: () => void;
        onblur?: () => void;
        onkeypress?: () => void;
        onclick?: () => void;
        optional?: boolean;
        variant?: "light";
        size?: "xs" | "sm" | "lg";
        height?: string;
        info?: Snippet;
    }

    let {
        id = undefined,
        label,
        placeHolder = "",
        onchange = () => {},
        disabled = false,
        value = $bindable(),
        onfocus = () => {},
        onblur = () => {},
        onkeypress,
        onclick = () => {},
        optional = false,
        variant = undefined,
        size = undefined,
        height = "h-[85px]",
        info,
    }: Props = $props();

    let uniqueId = (() => id || `input-${Math.random().toString(36).substring(2, 9)} `)();

    function autoResize(event: Event) {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
</script>

<div class="flex flex-col">
    <div class="input-label" class:hidden={!label && !info && !optional}>
        {#if label}
            <label for={uniqueId} class="relative grow">{label}</label>
        {/if}

        {#if info}
            <InfoButton>
                {@render info()}
            </InfoButton>
        {/if}

        {#if optional}
            <div class="text-xs opacity-50">
                {$LL.form.optional()}
            </div>
        {/if}
    </div>

    <div class="relative flex flex-auto">
        <textarea
            id={uniqueId}
            class="grow input-text input-icon {height} font-sans"
            class:input-text-light={variant === "light"}
            class:input-text-xs={size === "xs"}
            class:input-text-sm={size === "sm"}
            class:input-text-lg={size === "lg"}
            bind:value
            placeholder={placeHolder}
            {onkeypress}
            {onfocus}
            {onblur}
            {onchange}
            {onclick}
            oninput={autoResize}
            {disabled}
        ></textarea>
    </div>
</div>
