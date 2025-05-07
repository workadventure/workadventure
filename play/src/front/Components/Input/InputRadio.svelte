<script lang="ts">
    export let id: string | undefined = undefined;
    export let label: string;
    export let onChange = () => {};
    export let disabled = false;
    export let value: unknown;
    export let variant: "contrast" | "" = "";
    export let group: unknown;

    let uniqueId = id || `input-${Math.random().toString(36).substring(2, 9)} `;
</script>

<div class="flex items-center gap-2 p-2">
    <label class="inline-flex cursor-pointer relative ">
        <input id={uniqueId} class="sr-only peer" type="radio" bind:group {value} on:change={onChange} {disabled} />

        <div class="input-radio input-radio-light" class:input-radio-contrast={variant === "contrast"} />
    </label>

    <label for={uniqueId} class="  input-label input-label-inline input-label-light text-white "
        >{label} <slot />
    </label>
</div>
