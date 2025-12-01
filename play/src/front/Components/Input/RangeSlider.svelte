<script lang="ts">
    export let id: string | undefined = undefined;
    export let label: string | undefined = undefined;
    export let placeholder = "";
    export let min = 0;
    export let value = min;
    export let max = 100;
    export let step = 0;
    export let onChange: (v: number) => void = () => {};
    //secondary = bleu   light = noir sinon par défaut la ligne est blanche
    export let variant: "secondary" | "light" | "" = "";
    export let buttonShape: "square" | "" = "";
    export let unit = "%";
    export let valueFormatter: (v: number) => string = (v) => v.toString();
    // Control wrapper margins - if false, no margins are applied (useful in flex contexts)
    export let wrapperMargins = true;

    let uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)} `;
</script>

{#if label}
    <label for={uniqueId} class="px-3"> {label} <slot />: {valueFormatter(value)} {unit}</label>
{/if}

<div class={wrapperMargins ? "mx-2.5" : "w-full"}>
    <div
        class="input-range relative"
        class:input-range-light={variant === "light"}
        class:input-range-secondary={variant === "secondary"}
        class:input-range-square={buttonShape === "square"}
    >
        <!-- remove the -10px so that the slider does not extend out of the bar -->
        <div class="input-range-slider" style="width: calc({((value - min) / (max - min)) * 100}% - 10px);">
            <div class="input-range-btn group/range -end-5">
                {#if buttonShape === "square"}
                    <svg
                        class="input-range-dot absolute stroke-secondary left-0 m-auto right-0 group-hover/range:stroke-white"
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
                        <path d="M5 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                        <path d="M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                        <path d="M19 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0" />
                    </svg>
                {:else}
                    <div
                        class="input-range-dot absolute bg-secondary rounded-full h-1 w-1 aspect-square left-0 right-0 m-auto group-hover/range:bg-white"
                    />
                {/if}
            </div>
        </div>
        <input
            id={uniqueId}
            type="range"
            class="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
            {placeholder}
            {min}
            {max}
            {step}
            bind:value
            on:input={() => onChange(value)}
        />
    </div>
</div>
