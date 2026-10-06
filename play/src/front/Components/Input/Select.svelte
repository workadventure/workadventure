<script lang="ts">
    import type { Snippet } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import InfoButton from "./InfoButton.svelte";

    interface Props {
        label?: string;
        dataTestId?: string;
        options?: { value: string | undefined; label: string }[];
        id?: string;
        value?: string | boolean | null;
        onchange?: (e: Event) => void;
        onclick?: () => void;
        disabled?: boolean;
        placeholder?: string;
        variant?: "light";
        optional?: boolean;
        outerClass?: string;
        extraSelectClass?: string;
        info?: Snippet;
        children?: Snippet;
        helper?: Snippet;
        [key: string]: unknown;
    }

    let {
        label,
        dataTestId,
        options = [],
        id,
        value = $bindable(),
        onchange,
        onclick,
        disabled = false,
        placeholder = "",
        variant,
        optional = false,
        outerClass,
        extraSelectClass,
        info,
        children,
        helper,
        ...rest
    }: Props = $props();

    let uniqueId = (() => id || `input-${Math.random().toString(36).substring(2, 9)} `)();
</script>

<div class="flex flex-col {outerClass}">
    <div class="relative flex-grow">
        {#if label}
            <div class="input-label">
                <label for={uniqueId} class="grow font-light">{label}</label>
            </div>
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
        <select
            id={uniqueId}
            class="grow w-full input-select font-light pe-10 text-white {extraSelectClass}"
            class:input-select-light={variant === "light"}
            data-testid={dataTestId}
            {...rest}
            bind:value
            {onchange}
            {onclick}
            {placeholder}
            {disabled}
        >
            {#each options as { value: optionValue, label: optionLabel } (optionValue)}
                <option value={optionValue}>{optionLabel}</option>
            {/each}

            {@render children?.()}
        </select>
    </div>
</div>

{#if helper}
    {@render helper()}
{/if}
