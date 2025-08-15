<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import InfoButton from "./InfoButton.svelte";

    export let id: string | undefined = undefined;
    export let dataTestId: string | undefined = undefined;
    export let label: string | undefined = undefined;
    export let placeholder = "";
    export let onChange = () => {};
    export let onBlur = () => {};
    export let disabled = false;
    export let type: "text" | "url" | "number" = "text";
    export let value: string | number | null | undefined;
    export let onClick = () => {};
    export let variant: "light" | "" = "";
    export let size: "xs" | "sm" | "lg" | "" = "";
    export let appendSide: "left" | "right" = "right";
    export let status: "error" | "success" | "" = "";
    export let errorHelperText: string | null = null;
    // min, max, step are used only if type == "number"
    export let min = 0;
    export let max = 50;
    export let step = 0;
    export let onKeyPress = () => {};
    export let onKeyDown: (event: KeyboardEvent) => void = () => {};
    export let optional = false;
    export let isValid = true;
    export let rounded = false;
    export let onerror = () => {};
    export let onInput = () => {};
    export let onFocusin = (event: FocusEvent) => {};
    export let onFocusout = (event: FocusEvent) => {};
    export let extraInputClasses: string | undefined = undefined;
    export let maxlength: number | undefined = 524288; // for text input only

    export function focusInput() {
        inputElement.focus();
    }
    let inputElement: HTMLInputElement;

    const SLOTS = $$slots;

    let uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)} `;

    function validateInput(event: Event) {
        const inputElement = event.target as HTMLInputElement;
        isValid = inputElement.checkValidity();
        if (onInput) {
            onInput();
        }
    }
</script>

<div class="flex flex-col w-full">
    <div class="input-label" class:hidden={!label && !SLOTS.info && !optional}>
        {#if label}
            <label for={uniqueId} class="relative grow">{label}</label>
        {/if}

        {#if SLOTS.info}
            <InfoButton>
                <slot name="info" />
            </InfoButton>
        {/if}

        {#if optional}
            <div class="text-xs opacity-50 ">
                {$LL.form.optional()}
            </div>
        {/if}
    </div>

    <div class="relative flex flex-col grow">
        {#if type === "text"}
            <input
                id={uniqueId}
                type="text"
                class="grow input-text input-icon {extraInputClasses}"
                class:input-icon-left={appendSide === "left"}
                class:input-text-light={variant === "light"}
                class:input-text-xs={size === "xs"}
                class:input-text-sm={size === "sm"}
                class:input-text-lg={size === "lg"}
                class:error={status === "error"}
                class:success={status === "success"}
                class:rounded-full={rounded}
                {...$$restProps}
                bind:value
                {placeholder}
                on:keypress={onKeyPress}
                on:keydown={onKeyDown}
                on:change={onChange}
                on:click={onClick}
                on:input={validateInput}
                on:focusin={onFocusin}
                on:focusout={onFocusout}
                on:error={onerror}
                on:blur={onBlur}
                {disabled}
                bind:this={inputElement}
                {maxlength}
            />

            {#if errorHelperText}
                <p class="text-red-500 text-sm mt-1">{errorHelperText}</p>
            {/if}
        {:else if type === "url"}
            <input
                id={uniqueId}
                type="url"
                class="grow input-text input-icon"
                class:input-icon-left={appendSide === "left"}
                class:input-text-light={variant === "light"}
                class:input-text-xs={size === "xs"}
                class:input-text-sm={size === "sm"}
                class:input-text-lg={size === "lg"}
                class:error={status === "error"}
                class:success={status === "success"}
                data-testid={dataTestId}
                bind:value
                {placeholder}
                on:change={onChange}
                on:click={onClick}
                on:input={validateInput}
                on:blur={onBlur}
                min="{min}.toString()"
                {max}
                {step}
                {disabled}
            />
        {:else if type === "number"}
            <input
                id={uniqueId}
                type="number"
                class="grow input-text input-icon"
                class:input-icon-left={appendSide === "left"}
                class:input-text-light={variant === "light"}
                class:input-text-xs={size === "xs"}
                class:input-text-sm={size === "sm"}
                class:input-text-lg={size === "lg"}
                class:error={status === "error"}
                class:success={status === "success"}
                data-testid={dataTestId}
                bind:value
                {placeholder}
                on:change={onChange}
                on:click={onClick}
                on:input={validateInput}
                on:blur={onBlur}
                {min}
                {max}
                {step}
                {disabled}
            />
        {/if}
        {#if SLOTS.inputAppend}
            <div
                class="absolute inset-y-0 flex items-center pb-2"
                class:left-3={appendSide === "left"}
                class:right-3={appendSide === "right"}
            >
                <slot name="inputAppend" />
            </div>
        {/if}
    </div>

    {#if SLOTS.helper}
        <div class="flex items-center px-3 space-x-1.5 opacity-50">
            <div class="text-sm text-white grow">
                <slot name="helper" />
            </div>
        </div>
    {/if}
</div>
