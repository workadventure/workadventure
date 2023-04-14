<script lang="ts">
    import Svelecte from "svelecte";

    type Option = {
        value: string;
        label: string;
    };
    export let label: string;
    export let value: string[];
    export let options: Option[];
    export let onFocus: () => void;
    export let onBlur: () => void;
    export let errorHelperText: string | undefined = undefined;
</script>
<div class="input-tags">
    <label>
        {label}
    </label>
    <Svelecte {options}
              bind:value={value}
              multiple
              highlightFirstItem={false}
              placeholder="Select rights"
              on:focus={onFocus}
              on:blur={onBlur}
    >
    </Svelecte>
    {#if errorHelperText}
<span>
    {errorHelperText}
</span>
    {/if}
</div>

<style lang="scss">
    .input-tags {
        @apply tw-mb-2;
        label {
            @apply tw-font-medium tw-mb-1.5;
        }
        span{
            @apply tw-text-xs tw-text-pop-red;
        }
    }
    :global(.svelecte) {
        .sv-control {
            @apply tw-w-full tw-bg-white tw-text-brand-blue tw-border-lighter-purple tw-border-solid tw-m-0;
            border-width: 1.5px !important;

            .sv-content input.inputBox {
                @apply tw-text-brand-blue;
                border-color: transparent !important;
            }
        }
        &.error{
            @apply tw-border-pop-red;
        }
    }
    :global(.sv-control .sv-content input.inputBox) {
        @apply tw-text-brand-blue;
        &::placeholder {
            @apply tw-text-lighter-purple;
        }
        border-radius: initial;
        outline-color: white;
        box-shadow: none;
    }
    :global(.sv-dropdown .sv-dropdown-content .empty-list-row){
        @apply tw-text-brand-blue;
    }
</style>