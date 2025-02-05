<script lang="ts">
    export let id: string | undefined = undefined;
    export let label: string;
    export let onChange = () => {};
    export let disabled = false;
    export let value = false;
    export let variant: "light" | "" = "";

    let uniqueId = id || `input-${Math.random().toString(36).substr(2, 9)} `;
</script>

<div class="flex items-center gap-2 p-2">
    <label class="inline-flex cursor-pointer relative ">
        <input
            id={uniqueId}
            class="sr-only peer"
            type="checkbox"
            bind:checked={value}
            on:change={onChange}
            {disabled}
        />

        <div class="input-checkbox" class:input-checkbox-light={variant === "light"} />
    </label>

    <label for={uniqueId} class="  input-label input-label-inline input-label-light text-white "
        >{label} <slot />
    </label>
</div>
