<script lang="ts">
    import InfoButton from "./InfoButton.svelte";

    export let id: string | null = null;
    export let label: string;
    export let placeholder = "";
    export let onChange = () => {};
    export let disabled = false;
    export let type: "text" | "select" | "url" = "text";
    export let value: string | null | undefined;
    export let onClick = () => {};
    export let variant: "default" | "error" | "success" = "default";
    export let options: { value: string | undefined; label: string }[] = [];
    const SLOTS = $$slots;
    console.log(SLOTS);

    $: uniqueId = id || `input-${Math.random().toString(36).substr(2, 9)} `;
</script>

<div class="flex flex-col">
    <div class="input-label">
        <label for={id} class="grow">{label}</label>

        {#if SLOTS.info}
            <InfoButton>
                <slot name="info" />
            </InfoButton>
        {/if}
    </div>

    {#if type === "text"}
        <div class=" relative flex grow">
            <input
                id={uniqueId}
                type="text"
                class="grow input-text"
                bind:value
                {placeholder}
                on:change={onChange}
                on:click={onClick}
                {disabled}
            />
        </div>

        <div class="flex items-center px-3 space-x-1.5 opacity-50">
            <div class="text-sm text-white grow">
                {#if SLOTS.helper}
                    <slot name="helper" />
                {/if}
            </div>
        </div>
    {:else if type === "url"}
        <input
            {id}
            type="url"
            class="grow input-text input-text-light"
            bind:value
            {placeholder}
            on:change={onChange}
            on:click={onClick}
            {disabled}
        />
    {:else if type === "select"}
        <select
            {id}
            class="grow w-full input-text input-text-light font-light"
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
    {/if}
</div>
