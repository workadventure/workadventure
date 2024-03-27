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
    export let onFocus = () => {};
    export let onBlur = () => {};
    export let handleChange = () => {};

    let filterText = "";

    function handleFilter(e: { detail: [] }) {
        if (value?.find((i) => i.label === filterText)) return;
        if (e.detail.length === 0 && filterText.length > 0) {
            const prev = options.filter((i) => !i.created);
            options = [...prev, { value: filterText, label: filterText.toLocaleUpperCase(), created: true }];
        }
    }

    function _handleChange() {
        options = options.map((i) => {
            delete i.created;
            return { ...i, label: i.label.toLowerCase() };
        });
        handleChange();
    }
</script>

<div class="input-tags tw-flex tw-flex-col tw-pb-5 tw-text-dark-purple">
    <label for="selector" class="tw-text-white">
        {label}
    </label>
    <Select
        id="selector"
        on:filter={handleFilter}
        bind:filterText
        on:change={_handleChange}
        on:input={handleChange}
        on:select={handleChange}
        items={options}
        bind:value
        multiple={true}
        placeholder="Select rights"
        on:focus={onFocus}
        on:blur={onBlur}
        showChevron={true}
        --icons-color="var(--brand-blue)"
        --text-color="var(--brand-blue)"
    >
        <div slot="item" let:item>
            {item.created ? "Add new : " : ""}
            {item.label}
        </div>
    </Select>
</div>
