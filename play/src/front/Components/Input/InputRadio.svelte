<script lang="ts">
    export let id: string | undefined = undefined;
    export let label: string;
    export let onChange = () => {};
    export let disabled = false;
    export let value = false;
    export let variant: "contrast" | "" = "";
    //Pour changer la forme du bouton en checkbox (carré) au lieu de Radio (rond)
    export let checkbox = false;

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

        {#if checkbox === true}
            <div class="input-checkbox" />
        {:else}
            <div class="input-radio input-radio-light" class:input-radio-contrast={variant === "contrast"} />
        {/if}
    </label>

    <label for={uniqueId} class="  input-label input-label-inline input-label-light text-white "
        >{label} <slot />
    </label>
</div>
