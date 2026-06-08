<script lang="ts">
    import type { Snippet } from "svelte";
    interface Props {
        id?: string;
        label: string;
        onchange?: () => void;
        onfocusin?: (event: FocusEvent) => void;
        onfocusout?: (event: FocusEvent) => void;
        disabled?: boolean;
        value: unknown;
        variant?: "contrast";
        group: unknown;
        children?: Snippet;
    }

    let {
        id = undefined,
        label,
        onchange = () => {},
        onfocusin,
        onfocusout,
        disabled = false,
        value,
        variant = undefined,
        group = $bindable(),
        children,
    }: Props = $props();

    let uniqueId = (() => id || `input-${Math.random().toString(36).substring(2, 9)} `)();
</script>

<div class="flex items-center gap-2 p-2">
    <label class="inline-flex cursor-pointer relative">
        <input
            id={uniqueId}
            class="sr-only peer"
            type="radio"
            bind:group
            {value}
            {onchange}
            {onfocusin}
            {onfocusout}
            {disabled}
        />

        <div class="input-radio input-radio-light" class:input-radio-contrast={variant === "contrast"}></div>
    </label>

    <label for={uniqueId} class="  input-label input-label-inline input-label-light text-white">
        {label}
        {@render children?.()}
    </label>
</div>
