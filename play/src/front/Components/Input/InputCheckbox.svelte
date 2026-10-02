<script lang="ts">
    import type { Snippet } from "svelte";
    interface Props {
        id?: string;
        dataTestId?: string;
        label?: string;
        onchange?: () => void;
        disabled?: boolean;
        value?: boolean;
        variant?: "white";
        children?: Snippet;
        [key: string]: unknown;
    }

    let {
        id = undefined,
        dataTestId = undefined,
        label = undefined,
        onchange = () => {},
        disabled = false,
        value = $bindable<boolean>(),
        variant = "white",
        children,
        ...rest
    }: Props = $props();

    if (value === undefined) {
        value = false;
    }

    let uniqueId = (() => id || `input-${Math.random().toString(36).substring(2, 9)} `)();
</script>

<div class="flex items-center gap-2 p-2" data-testid={dataTestId}>
    <label class="inline-flex cursor-pointer relative">
        <input
            id={uniqueId}
            class="sr-only peer"
            type="checkbox"
            bind:checked={value}
            {onchange}
            {...rest}
            {disabled}
        />

        <div class="input-checkbox" class:input-checkbox-white={variant === "white"}></div>
    </label>

    {#if label}
        <label for={uniqueId} class="input-label input-label-inline input-label-light text-white">
            {label}
            {@render children?.()}
        </label>
    {/if}
</div>
