<script lang="ts">
    import IconWorldSearch from "../Icons/IconWorldSearch.svelte";
    import SettingIconBtn from "../Icons/SettingIconBtn.svelte";
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
                class="grow input-text "
                class:input-switch-light={variant === "light"}
                bind:value
                {placeholder}
                on:change={onChange}
                on:click={onClick}
                {disabled}
            />
            {#if SLOTS.IconWorldSearch}
                <IconWorldSearch><slot name="IconWorldSearch" /></IconWorldSearch>
            {/if}

            {#if SLOTS.InBtnRight}
                <button class="btn btn-sm btn-secondary absolute top-0 bottom-2 right-1.5 m-auto h-9">
                    <div class="btn-label"><slot name="InBtnRight" /></div>
                </button>
            {/if}
            {#if SLOTS.SettingIconBtn}
                <SettingIconBtn><slot name="SettingIconBtn" /></SettingIconBtn>
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
            {id}
            type="url"
            class="grow input-text input-text-light"
            bind:value
            {placeholder}
            on:change={onChange}
            on:click={onClick}
            {disabled}
        />
    {/if}
</div>
