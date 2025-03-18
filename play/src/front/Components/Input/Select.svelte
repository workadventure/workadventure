<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import ChevronDownIcon from "../Icons/ChevronDownIcon.svelte";
    import InfoButton from "./InfoButton.svelte";

    export let label: string | undefined = undefined;
    export let options: { value: string | undefined; label: string }[] = [];
    export let id: string | undefined = undefined;
    export let value: string | boolean | null | undefined;
    export let onChange = () => {};
    export let onClick = () => {};
    export let disabled = false;
    export let placeholder = "";
    export let variant: "light" | "" = "";
    export let optional = false;

    const SLOTS = $$slots;

    let uniqueId = id || `input-${Math.random().toString(36).substr(2, 9)} `;
</script>

<div class="flex flex--col">
    <div class="relative flex-grow">
        <div class="input-label">
            {#if label}
                <label for={uniqueId} class="grow font-light">{label}</label>
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
        </div>

        <select
            id={uniqueId}
            class="grow w-full input-select font-light pr-10"
            class:input-select-light={variant === "light"}
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
        <div class="absolute inset-y-0  right-0 mt-6 flex items-center pr-2 pointer-events-none">
            <ChevronDownIcon />
        </div>
    </div>
</div>

{#if SLOTS.helper}
    <div class="flex items-center px-3 space-x-1.5 opacity-50">
        <div class="text-sm text-white grow">
            <slot name="helper" />
        </div>
    </div>
{/if}
