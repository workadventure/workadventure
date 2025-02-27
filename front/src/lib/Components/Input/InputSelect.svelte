<script lang="ts">
    type Option = {
        value: string;
        label: string;
    };
    export let label: string;
    export let value: string;
    export let options: Option[];
    export let errorHelperText: string | undefined = undefined;
</script>

<div class="input-select">
    <label for="input">
        {label}
    </label>
    <select id="input" bind:value>
        {#each options as option (option.value)}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
    {#if errorHelperText}
        <span>
            {errorHelperText}
        </span>
    {/if}
</div>
