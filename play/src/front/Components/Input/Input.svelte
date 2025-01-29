<script lang="ts">
    import InfoButton from "./InfoButton.svelte";

    export let id: string | undefined = undefined;
    export let label: string;
    export let placeholder = "";
    export let onChange = () => {};
    export let disabled = false;
    export let type: "text" | "url" = "text";
    export let value: string | null | undefined;
    export let onClick = () => {};
    export let variant: "light" | "" = "";
    export let size: "xs" | "sm" | "lg" | "" = "";
    export let AppendSide: "left" | "" = "";
    export let status: "error" | "success" | "" = "";

    const SLOTS = $$slots;

    let uniqueId = id || `input-${Math.random().toString(36).substr(2, 9)} `;
</script>

<div class="flex flex-col">
    <div class="input-label">
        <label for={uniqueId} class=" relative grow">{label}</label>

        {#if SLOTS.info}
            <InfoButton>
                <slot name="info" />
            </InfoButton>
        {/if}

        {#if SLOTS.optional}
            <div class="text-xs opacity-50 ">
                <slot name="optional" />
            </div>
        {/if}
    </div>

    {#if type === "text"}
        <div class=" relative flex grow">
            <input
                id={uniqueId}
                type="text"
                class="grow input-text input-icon  "
                class:input-icon-left={AppendSide === "left"}
                class:input-text-light={variant === "light"}
                class:input-text-xs={size === "xs"}
                class:input-text-sm={size === "sm"}
                class:input-text-lg={size === "lg"}
                class:error={status === "error"}
                class:success={status === "success"}
                bind:value
                {placeholder}
                on:change={onChange}
                on:click={onClick}
                {disabled}
            />
            {#if SLOTS.InputAppend}
                <slot name="InputAppend" />
            {/if}
        </div>
    {/if}

    {#if SLOTS.helper}
        <div class="flex items-center px-3 space-x-1.5 opacity-50">
            <div class="text-sm text-white grow">
                <slot name="helper" />
            </div>
        </div>
    {/if}

    {#if type === "url"}
        <input
            id={uniqueId}
            type="url"
            class="grow input-text input-text"
            class:input-text-light={variant === "light"}
            class:input-text-xs={size === "xs"}
            class:input-text-sm={size === "sm"}
            class:input-text-lg={size === "lg"}
            bind:value
            {placeholder}
            on:change={onChange}
            on:click={onClick}
            {disabled}
        />
    {/if}
</div>
