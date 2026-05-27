<script lang="ts">
    interface Props {
        id?: string;
        label?: string;
        value?: boolean;
        onchange?: () => void;
        disabled?: boolean;
        labelPosition?: "top" | "right";
        variant?: "white" | "black";
    }

    let {
        id,
        label = undefined,
        value = $bindable(false),
        onchange = () => {},
        disabled = false,
        labelPosition = "right",
        variant = "black",
    }: Props = $props();

    let uniqueId = (() => id || `input-${Math.random().toString(36).substring(2, 9)} `)();
</script>

<div class="value-switch">
    {#if labelPosition === "top" && label}
        <label for={uniqueId} class="input-label">{label}</label>
    {/if}
    <label class="inline-flex cursor-pointer items-center relative mt-3">
        <input id={uniqueId} type="checkbox" class="sr-only peer" bind:checked={value} {onchange} {disabled} />
        <div class="input-switch" class:input-switch-white={variant === "white"} data-testid={uniqueId}></div>
        {#if labelPosition === "right" && label}
            <span class="input-label input-label-inline ml-3 text-white/50 font-regular peer-checked:text-white"
                >{label}</span
            >
        {/if}
    </label>
</div>
