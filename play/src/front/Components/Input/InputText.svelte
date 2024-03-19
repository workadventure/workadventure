<script lang="ts">
    export let label: string;
    export let placeHolder = "";
    export let value: string;
    export let onFocus = () => {};
    export let onBlur = () => {};
    export let onKeyPress: () => void;
    export let errorHelperText: string | undefined = undefined;
    export let error = false;
</script>

<div class="flex flex-col">
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
        class:error={errorHelperText || error}
        class:!border-red-500={errorHelperText || error}
    />
    {#if errorHelperText}
        <span class="error">
            {errorHelperText}
        </span>
    {/if}
</div>
