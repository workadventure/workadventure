<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import InfoButton from "./InfoButton.svelte";

    export let label: string | undefined = undefined;
    export let dataTestId: string | undefined = undefined;
    export let options: { value: string | undefined; label: string }[] = [];
    export let id: string | undefined = undefined;
    export let value: string | boolean | null | undefined;
    export let onChange: (e: Event) => void = () => {};
    export let onClick = () => {};
    export let disabled = false;
    export let placeholder = "";
    export let variant: "light" | "" = "";
    export let optional = false;
    export let outerClass: string | undefined = undefined;
    export let extraSelectClass: string | undefined = undefined;

    const SLOTS = $$slots;

    let uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)} `;
</script>

<div class="flex flex-col {outerClass}">
    <div class="relative flex-grow">
        {#if label}
            <div class="input-label">
                <label for={uniqueId} class="grow font-light">{label}</label>
            </div>
        {/if}

        {#if SLOTS.info}
            <InfoButton>
                <slot name="info" />
            </InfoButton>
        {/if}

        {#if optional}
            <div class="text-xs opacity-50 ">
                {$LL.form.optional()}
            </div>
        {/if}
        <select
            id={uniqueId}
            class="grow w-full input-select font-light pe-10 text-white {extraSelectClass}"
            class:input-select-light={variant === "light"}
            data-testid={dataTestId}
            {...$$restProps}
            bind:value
            on:change={onChange}
            on:click={onClick}
            {placeholder}
            {disabled}
        >
            {#each options as { value: optionValue, label: optionLabel } (optionValue)}
                <option value={optionValue}>{optionLabel}</option>
            {/each}

            <slot />
        </select>
    </div>
</div>

{#if SLOTS.helper}
    <div class="flex items-center px-3 space-x-1.5 opacity-50">
        <div class="text-sm text-white grow">
            <slot name="helper" />
        </div>
    </div>
{/if}
