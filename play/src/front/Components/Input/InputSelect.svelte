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
        {#each options as option}
            <option value={option.value}>{option.label}</option>
        {/each}
    </select>
    {#if errorHelperText}
        <span>
            {errorHelperText}
        </span>
    {/if}
</div>

<style lang="scss">
    .input-select {
        @apply tw-mb-2;
        label {
            @apply tw-font-medium tw-mb-1.5;
        }

        select {
            @apply tw-w-full tw-bg-white tw-text-brand-blue tw-border-lighter-purple tw-border-solid tw-m-0;
            &.error {
                @apply tw-border-pop-red;
            }
        }
        span {
            @apply tw-text-xs tw-text-pop-red;
        }
    }
</style>
