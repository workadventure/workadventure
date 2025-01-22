<script>
    export let id = "";
    export let label = "";
    export let value = "";
    export let placeholder = "";
    export let onChange = () => {};
    export let disabled = false;
</script>

<label for={id}>{label}</label>
<div class="relative flex grow">
    <input
        {id}
        type="text"
        class="grow input-text input-text-light"
        bind:value
        {placeholder}
        on:change={onChange}
        {disabled}
    />
</div>
