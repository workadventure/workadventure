<script lang="ts">
    import Select from "svelte-select";

    type Option = {
        value: string;
        label: string;
        created: undefined | boolean;
    };
    export let label: string;
    export let value: Option[];
    export let options: Option[];
    export let onFocus: () => void;
    export let onBlur: () => void;

    let filterText = "";

    function handleFilter(e: { detail: [] }) {
        if (value?.find((i) => i.label === filterText)) return;
        if (e.detail.length === 0 && filterText.length > 0) {
            const prev = options.filter((i) => !i.created);
            options = [...prev, { value: filterText, label: filterText.toLocaleUpperCase(), created: true }];
        }
    }

    function handleChange() {
        options = options.map((i) => {
            delete i.created;
            return { ...i, label: i.label.toLocaleUpperCase() };
        });
    }
</script>

<div class="input-tags">
    <label>
        {label}
    </label>
    <Select
        on:filter={handleFilter}
        bind:filterText
        on:change={handleChange}
        items={options}
        bind:value
        multiple={true}
        placeholder="Select rights"
        on:focus={onFocus}
        on:blur={onBlur}
        showChevron={true}
        --icons-color="var(--brand-blue)"
    >
        <div slot="item" let:item>
            {item.created ? "Add new : " : ""}
            {item.label}
        </div>
    </Select>
</div>

<style lang="scss">
    .input-tags {
        @apply tw-mb-2;
        label {
            @apply tw-font-medium tw-mb-1.5;
        }
        span {
            @apply tw-text-xs tw-text-pop-red;
        }
    }
    :global(.svelte-select) {
        border-radius: 8px !important;
        padding-left: 0.75rem !important;
        border-color: rgb(146, 142, 187) !important;
        transition: all ease-in-out 150ms !important;
    }
    :global(.svelte-select.focused) {
        @apply tw-outline tw-outline-lighter-purple;
    }
    :global(.svelte-select .value-container) {
        padding: 0 5px !important;
    }
    :global(.svelte-select .value-container input) {
        @apply tw-border-0 tw-outline-0 tw-ring-0 tw-rounded-none;
        color: rgb(20 48 76 / var(--tw-text-opacity)) !important;
    }
    :global(.svelte-select .svelte-select-list) {
        @apply tw-text-brand-blue;
    }
    :global(.value-container .multi-item :is(.multi-item-clear, .multi-item-text)) {
        @apply tw-text-brand-blue;
    }
    :global(.svelte-select .indicators svg) {
        @apply tw-text-brand-blue;
    }
</style>
