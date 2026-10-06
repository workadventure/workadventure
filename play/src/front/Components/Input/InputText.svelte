<script lang="ts">
    interface Props {
        label?: string;
        placeHolder?: string;
        value?: string;
        onchange?: () => void;
        onfocus?: () => void;
        onblur?: () => void;
        onkeypress?: () => void;
        onclick?: () => void;
        errorHelperText?: string;
        error?: boolean;
    }

    let {
        label,
        placeHolder = "",
        value = $bindable(),
        onchange = () => {},
        onfocus = () => {},
        onblur = () => {},
        onkeypress = () => {},
        onclick = () => {},
        errorHelperText = undefined,
        error = false,
    }: Props = $props();
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
        {onchange}
        {onfocus}
        {onblur}
        {onkeypress}
        {onclick}
        class:error={errorHelperText || error}
        class:!border-red-500={errorHelperText || error}
    />
    {#if errorHelperText}
        <span class="error">
            {errorHelperText}
        </span>
    {/if}
</div>
