<script lang="ts">
    import type { Snippet } from "svelte";
    import { onDestroy } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { inputFormFocusStore } from "../../Stores/UserInputStore";
    import InfoButton from "./InfoButton.svelte";

    interface Props {
        id?: string;
        dataTestId?: string;
        label?: string;
        placeholder?: string;
        onchange?: () => void;
        onblur?: () => void;
        disabled?: boolean;
        type?: "text" | "url" | "number" | "color";
        value?: string | number | null;
        onclick?: () => void;
        variant?: "light";
        size?: "xs" | "sm" | "lg";
        appendSide?: "left" | "right";
        status?: "error" | "success";
        errorHelperText?: string | null;
        // min, max, step are used only if type == "number"
        min?: number;
        max?: number;
        step?: number;
        onkeypress?: () => void;
        onkeydown?: (event: KeyboardEvent) => void;
        optional?: boolean;
        isValid?: boolean;
        rounded?: boolean;
        onerror?: () => void;
        oninput?: () => void;
        onfocusin?: (event: FocusEvent) => void;
        onfocusout?: (event: FocusEvent) => void;
        extraInputClasses?: string;
        maxlength?: number; // for text input only
        info?: Snippet;
        inputAppend?: Snippet;
        helper?: Snippet;
        [key: string]: unknown;
    }

    let {
        id = undefined,
        dataTestId = undefined,
        label = undefined,
        placeholder = "",
        onchange = () => {},
        onblur = () => {},
        disabled = false,
        type = "text",
        value = $bindable<string | number | null>(),
        onclick = () => {},
        variant = undefined,
        size = undefined,
        appendSide = "right",
        status = undefined,
        errorHelperText = null,
        min = 0,
        max = 50,
        step = 0,
        onkeypress = () => {},
        onkeydown = () => {},
        optional = false,
        isValid = $bindable<boolean>(),
        rounded = false,
        onerror = () => {},
        oninput = () => {},
        onfocusin = (event: FocusEvent) => {},
        onfocusout = (event: FocusEvent) => {},
        extraInputClasses = undefined,
        maxlength = 524288,
        info,
        inputAppend,
        helper,
        ...rest
    }: Props = $props();

    if (isValid === undefined) {
        isValid = true;
    }

    export function focusInput() {
        inputElement?.focus();
    }
    let inputElement: HTMLInputElement | undefined = $state();
    let isComposing = false;

    function onCompositionStart() {
        isComposing = true;
    }

    function onCompositionEnd() {
        // Defer to next tick: some browsers fire keydown(Enter) after compositionend when the user
        // confirms IME conversion. If we set isComposing = false here immediately, that Enter would
        // be treated as "send" instead of "confirm"; deferring keeps the confirming Enter ignored.
        setTimeout(() => {
            isComposing = false;
        }, 0);
    }

    function handleKeyDown(event: KeyboardEvent) {
        if (event.key === "Enter" && (event.isComposing || isComposing)) {
            return;
        }
        onkeydown(event);
    }

    let uniqueId = (() => id || `input-${Math.random().toString(36).substring(2, 9)} `)();

    function validateInput(event: Event) {
        const inputElement = event.target as HTMLInputElement;
        isValid = inputElement.checkValidity();
        if (oninput) {
            oninput();
        }
    }

    // On Firefox, blur is not called when the element is removed from the DOM while focused.
    // Let's blur it manually in this case.
    onDestroy(() => {
        if (inputElement && document.activeElement === inputElement) {
            inputElement.blur();
            inputFormFocusStore.set(false);
        }
    });
</script>

<div class="flex flex-col w-full">
    <div class="input-label" class:hidden={!label && !info && !optional}>
        {#if label}
            <label for={uniqueId} class="relative grow">{label}</label>
        {/if}

        {#if info}
            <InfoButton>
                {@render info()}
            </InfoButton>
        {/if}

        {#if optional}
            <div class="text-xs opacity-50">
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
                {...rest}
                bind:value
                {placeholder}
                {onkeypress}
                onkeydown={handleKeyDown}
                oncompositionstart={onCompositionStart}
                oncompositionend={onCompositionEnd}
                {onchange}
                {onclick}
                oninput={validateInput}
                {onfocusin}
                {onfocusout}
                {onerror}
                {onblur}
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
                {onchange}
                {onclick}
                oninput={validateInput}
                {onblur}
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
                {onchange}
                {onclick}
                oninput={validateInput}
                {onblur}
                {min}
                {max}
                {step}
                {disabled}
            />
        {:else if type === "color"}
            <input
                id={uniqueId}
                type="color"
                class="grow input-text input-icon border-0 bg-transparent hover:bg-transparent active:bg-transparent mx-auto w-full p-0 border-none"
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
                {onchange}
                {onclick}
                oninput={validateInput}
                {onblur}
                {min}
                {max}
                {step}
                {disabled}
            />{/if}
        {#if inputAppend}
            <div
                class="absolute inset-y-0 flex items-center pb-2"
                class:left-3={appendSide === "left"}
                class:right-3={appendSide === "right"}
            >
                {@render inputAppend?.()}
            </div>
        {/if}
    </div>

    {#if helper}
        <div class="flex items-center px-3 space-x-1.5 opacity-50">
            <div class="text-sm text-white grow">
                {@render helper()}
            </div>
        </div>
    {/if}
</div>
