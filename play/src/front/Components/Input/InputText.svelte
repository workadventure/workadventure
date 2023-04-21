<script lang="ts">
    export let label: string;
    export let placeHolder = "";
    export let value: string;
    export let onFocus: () => void;
    export let onBlur: () => void;
    export let onKeyPress: () => void;
    export let errorHelperText: string | undefined = undefined;
</script>

<div class="input-text">
    <label for="input">
        {label}
    </label>
    <input
        id="input"
        type="text"
        placeholder={placeHolder}
        bind:value
        on:focus={onFocus}
        on:blur={onBlur}
        on:keypress={onKeyPress}
        class:error={errorHelperText}
    />
    {#if errorHelperText}
        <span>
            {errorHelperText}
        </span>
    {/if}
</div>

<style lang="scss">
    .input-text {
        @apply tw-mb-2;
        label {
            @apply tw-font-medium tw-mb-1.5;
        }

        input {
            @apply tw-w-full tw-bg-white tw-text-brand-blue tw-border-lighter-purple tw-border-solid tw-m-0;
            border-width: 1px !important;
            &.error {
                @apply tw-border-pop-red;
            }
        }
        span {
            @apply tw-text-xs tw-text-pop-red;
        }
    }
</style>
