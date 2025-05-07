<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import InfoButton from "./InfoButton.svelte";

    export let id: string | undefined = undefined;
    export let label: string;
    export let placeHolder = "";
    export let onChange = () => {};
    export let disabled = false;
    export let value: string | null | undefined;
    export let onFocus = () => {};
    export let onBlur = () => {};
    export let onKeyPress: () => void;
    export let onClick = () => {};
    export let optional = false;
    export let variant: "light" | "" = "";
    export let size: "xs" | "sm" | "lg" | "" = "";
    export let height = "h-[85px]";

    const SLOTS = $$slots;

    let uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)} `;

    function autoResize(event: Event) {
        const textarea = event.target as HTMLTextAreaElement;
        textarea.style.height = "auto";
        textarea.style.height = `${textarea.scrollHeight}px`;
    }
</script>

<div class="flex flex-col">
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

    <div class="relative flex flex-auto ">
        <textarea
            id={uniqueId}
            class="grow input-text input-icon {height} font-sans"
            class:input-text-light={variant === "light"}
            class:input-text-xs={size === "xs"}
            class:input-text-sm={size === "sm"}
            class:input-text-lg={size === "lg"}
            bind:value
            placeholder={placeHolder}
            on:keypress={onKeyPress}
            on:focus={onFocus}
            on:blur={onBlur}
            on:change={onChange}
            on:click={onClick}
            on:input={autoResize}
            {disabled}
        />
    </div>
</div>
