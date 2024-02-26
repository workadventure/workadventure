<script lang="ts">
    export let label: string;
    export let placeHolder = "";
    export let value: string;
    export let onFocus = () => {};
    export let onBlur = () => {};
    export let onKeyPress: () => void;
    export let errorHelperText: string | undefined = undefined;
</script>

<div class="tw-flex tw-flex-col">
    <label for="input">
        {label}
    </label>
    <textarea
        id="input"
        placeholder={placeHolder}
        bind:value
        on:focus={onFocus}
        on:blur={onBlur}
        on:keypress={onKeyPress}
        class:error={errorHelperText}
    />
    {#if errorHelperText}
        <span class="error">
            {errorHelperText}
        </span>
    {/if}
</div>
