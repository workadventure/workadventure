<script lang="ts">
    export let id: string;
    export let label: string | undefined = undefined;
    export let value = false;
    export let onChange = () => {};
    export let disabled = false;
    export let labelPosition: "top" | "right" = "right";
    export let variant: "white" | "black" = "black";
</script>

<div class="value-switch">
    {#if labelPosition === "top" && label}
        <label for={id} class="input-label">{label}</label>
    {/if}
    <label class="inline-flex cursor-pointer items-center relative">
        <input {id} type="checkbox" class="sr-only peer" bind:checked={value} on:change={onChange} {disabled} />
        <div class="input-switch" class:input-switch-white={variant === "white"} />
        {#if labelPosition === "right" && label}
            <span class="input-label input-label-inline ml-3 text-white/50 font-regular peer-checked:text-white">{label}</span>
        {/if}
    </label>
</div>
