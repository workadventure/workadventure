<script lang="ts">
    import type { Snippet } from "svelte";

    interface Props {
        id?: string;
        label?: string;
        value?: boolean;
        onchange?: () => void;
        disabled?: boolean;
        labelPosition?: "top" | "right";
        variant?: "white" | "black";
        children?: Snippet;
        description?: Snippet;
        margin?: string;
        spacing?: string;
        alignLabel?: "top" | "center";
    }

    let {
        id,
        label = undefined,
        value = $bindable<boolean>(),
        onchange = () => {},
        disabled = false,
        labelPosition = "right",
        variant = "black",
        children,
        description,
        margin = "mt-3",
        spacing = "ml-3",
        alignLabel = "top",
    }: Props = $props();

    if (value === undefined) {
        value = false;
    }

    let uniqueId = (() => id || `input-${Math.random().toString(36).substring(2, 9)}`)();
    let hasLabel = $derived(label !== undefined || children !== undefined);
</script>

<div class="value-switch">
    {#if labelPosition === "top" && hasLabel}
        <label for={uniqueId} class="input-label">
            {#if children}
                {@render children()}
            {:else}
                {label}
            {/if}
        </label>
    {/if}
    <label
        class="inline-flex cursor-pointer relative {margin}"
        class:items-start={alignLabel === "top"}
        class:items-center={alignLabel === "center"}
    >
        <input id={uniqueId} type="checkbox" class="sr-only peer" bind:checked={value} {onchange} {disabled} />
        <div class="input-switch" class:input-switch-white={variant === "white"} data-testid={uniqueId}></div>
        {#if labelPosition === "right" && hasLabel}
            <div class="flex flex-col items-start">
                <span
                    class={`input-label flex-col items-start input-label-inline ${spacing} font-regular ${value ? "text-white" : "text-white/50"}`}
                >
                    {#if children}
                        {@render children()}
                    {:else}
                        {label}
                    {/if}
                </span>
                {#if description}
                    <span class="block text-sm text-white/50 font-regular mt-1 {spacing} px-3">
                        {@render description()}
                    </span>
                {/if}
            </div>
        {/if}
    </label>
    {#if labelPosition === "top" && description}
        <div class="input-label text-sm text-white/50 font-regular mt-1">
            {@render description()}
        </div>
    {/if}
</div>
