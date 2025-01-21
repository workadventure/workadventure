<script>
    export let id;
    export let label;
    export let value = false;
    export let onChange = () => {};
    export let disabled = false;
</script>

<div class="value-switch">
    <label for={id}>{label}</label>
    <label class="inline-flex cursor-pointer">
        <input {id} type="checkbox" class="sr-only peer" bind:checked={value} on:change={onChange} {disabled} />
        <div class="input-switch input-switch-white" />
    </label>
</div>
