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
