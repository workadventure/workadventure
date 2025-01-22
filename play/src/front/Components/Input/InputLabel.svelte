<script lang="ts">
    export let id: string;
    export let label: string;
    export let placeholder = "";
    export let onChange = () => {};
    export let disabled = false;
    export let options: { value: string | undefined; label: string }[] = [];
    export let type: "text" | "select" | "url" = "text";
    export let value: string | null | undefined;
    export let onClick = () => {};
</script>

<div class="relative flex grow flex-col">
    <label for={id}>{label}</label>
    {#if type === "text"}
        <input
            {id}
            type="text"
            class="grow input-text input-text-light"
            bind:value
            {placeholder}
            on:change={onChange}
            on:click={onClick}
            {disabled}
        />
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
