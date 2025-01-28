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
    export let showIcon = false;
    export let button1 = false;
    export let buttonsquare = false;
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
            {#if showIcon}
                <svg
                    class="icon icon-tabler icon-tabler-world-search stroke-contrast-400 absolute top-0 bottom-2 m-auto right-3 peer-hover:stroke-secondary-500 peer-focus:stroke-secondary transition-all"
                    fill="none"
                    height="24"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.5"
                    viewBox="0 0 24 24"
                    width="24"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path d="M0 0h24v24H0z" fill="none" stroke="none" />
                    <path d="M21 12a9 9 0 1 0 -9 9" />
                    <path d="M3.6 9h16.8" />
                    <path d="M3.6 15h7.9" />
                    <path d="M11.5 3a17 17 0 0 0 0 18" />
                    <path d="M12.5 3a16.984 16.984 0 0 1 2.574 8.62" />
                    <path d="M18 18m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
                    <path d="M20.2 20.2l1.8 1.8" />
                </svg>
            {:else if button1}
                <button class="btn btn-sm btn-secondary absolute top-0 bottom-2 right-1.5 m-auto h-9">
                    <div class="btn-label">Button</div>
                </button>
            {:else if buttonsquare}
                <button class="btn btn-xs btn-secondary btn-square absolute top-0 bottom-2 m-auto h-9 right-1">
                    <svg
                        class="btn-icon fill-inherit"
                        fill="none"
                        height="20"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.5"
                        viewBox="0 0 24 24"
                        width="20"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path d="M0 0h24v24H0z" fill="none" stroke="none" />
                        <path
                            d="M6 3a1 1 0 0 1 .993 .883l.007 .117v3.171a3.001 3.001 0 0 1 0 5.658v7.171a1 1 0 0 1 -1.993 .117l-.007 -.117v-7.17a3.002 3.002 0 0 1 -1.995 -2.654l-.005 -.176l.005 -.176a3.002 3.002 0 0 1 1.995 -2.654v-3.17a1 1 0 0 1 1 -1z"
                            fill="currentColor"
                            stroke-width="0"
                        />
                        <path
                            d="M12 3a1 1 0 0 1 .993 .883l.007 .117v9.171a3.001 3.001 0 0 1 0 5.658v1.171a1 1 0 0 1 -1.993 .117l-.007 -.117v-1.17a3.002 3.002 0 0 1 -1.995 -2.654l-.005 -.176l.005 -.176a3.002 3.002 0 0 1 1.995 -2.654v-9.17a1 1 0 0 1 1 -1z"
                            fill="currentColor"
                            stroke-width="0"
                        />
                        <path
                            d="M18 3a1 1 0 0 1 .993 .883l.007 .117v.171a3.001 3.001 0 0 1 0 5.658v10.171a1 1 0 0 1 -1.993 .117l-.007 -.117v-10.17a3.002 3.002 0 0 1 -1.995 -2.654l-.005 -.176l.005 -.176a3.002 3.002 0 0 1 1.995 -2.654v-.17a1 1 0 0 1 1 -1z"
                            fill="currentColor"
                            stroke-width="0"
                        />
                    </svg>
                </button>
            {/if}
        </div>
        {#if SLOTS.helper}
            <div class="flex items-center px-3 space-x-1.5 opacity-50">
                <div class="text-sm text-white grow">
                    <slot name="helper" />
                </div>
            </div>
        {/if}
    {:else if type === "url"}
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
