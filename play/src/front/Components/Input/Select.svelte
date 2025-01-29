<script lang="ts">
    import InfoButton from "./InfoButton.svelte";

    export let label: string;
    export let options: { value: string | undefined; label: string }[] = [];
    export let id: string | undefined = undefined;
    export let value: string | null | undefined;
    export let onChange = () => {};
    export let onClick = () => {};
    export let disabled = false;
    export let placeholder = "";
    export let type: "text" | "select" = "text";
    export let variant: "light" | "" = "";

    const SLOTS = $$slots;
</script>

<div class="flex flex--col">
    {#if type === "select"}
        <div class="relative flex-grow">
            <div class="input-label">
                <label for={id} class="grow font-light">{label}</label>

                {#if SLOTS.info}
                    <InfoButton>
                        <slot name="info" />
                    </InfoButton>
                {/if}

                {#if SLOTS.optional}
                    <div class="text-xs opacity-50 ">
                        <slot name="optional" />
                    </div>
                {/if}
            </div>

            <select
                {id}
                class="grow w-full input-select font-light"
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
            </select>
        </div>
    {/if}
</div>
{#if SLOTS.helper}
    <div class="flex items-center px-3 space-x-1.5 opacity-50">
        <div class="text-sm text-white grow">
            <slot name="helper" />
        </div>
    </div>
{/if}
