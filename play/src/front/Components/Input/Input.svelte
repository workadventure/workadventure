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
    export let taille: "xs" | "sm" | "lg" | "" = "";
    export let side: "left" | "" = "";

    const SLOTS = $$slots;
    console.log(SLOTS);

    let uniqueId = id || `input-${Math.random().toString(36).substr(2, 9)} `;
</script>

<div class="flex flex-col">
    <div class="input-label">
        <label for={uniqueId} class="grow">{label}</label>

        {#if SLOTS.info}
            <InfoButton>
                <slot name="info" />
            </InfoButton>
        {/if}
    </div>

    {#if type === "text"}
        <div class=" relative flex grow">
            <input
                id={uniqueId}
                type="text"
                class="grow input-text input-icon "
                class:input-icon-left={side === "left"}
                class:input-switch-light={variant === "light"}
                class:input-text-xs={taille === "xs"}
                class:input-text-sm={taille === "sm"}
                class:input-text-lg={taille === "lg"}
                bind:value
                {placeholder}
                on:change={onChange}
                on:click={onClick}
                {disabled}
            />
            {#if SLOTS.right}
                <slot name="right" />
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
            class:input-switch-light={variant === "light"}
            class:input-text-xs={taille === "xs"}
            class:input-text-sm={taille === "sm"}
            class:input-text-lg={taille === "lg"}
            bind:value
            {placeholder}
            on:change={onChange}
            on:click={onClick}
            {disabled}
        />
    {/if}
</div>
