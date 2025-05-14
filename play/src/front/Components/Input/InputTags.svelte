<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import Select from "svelte-select";
    import LL from "../../../i18n/i18n-svelte";
    import { InputTagOption } from "./InputTagOption";
    import InfoButton from "./InfoButton.svelte";
    const dispatch = createEventDispatcher<{
        change: InputTagOption[] | undefined;
    }>();

    export let optional = false;
    export let label: string | undefined = undefined;
    export let value: InputTagOption[] | undefined;
    export let options: InputTagOption[] = [];
    export let placeholder: string | undefined = undefined;
    export let onFocus = () => {};
    export let onBlur = () => {};
    export let handleChange = () => {};
    export let testId: string | undefined = undefined;
    export let queryOptions: undefined | ((filterText: string) => Promise<{ value: string; label: string }[]>) =
        undefined;

    let filterText = "";
    const SLOTS = $$slots;

    function handleFilter() {
        if (value?.find((i) => i.label === filterText)) return;
        if (options?.find((i) => i.label === filterText)) return;
        if (filterText.trim().length > 0) {
            const prev = options.filter((i) => !i.created);
            options = [...prev, { value: filterText, label: filterText, created: true }];
        }
    }

    function _handleChange() {
        options = options.map((i) => {
            delete i.created;
            return { ...i };
        });
        dispatch("change", value);
    }
</script>

<div class="flex flex-col pb-5 text-dark-purple">
    <div class="input-label" class:hidden={!label && !SLOTS.info && !optional}>
        {#if label}
            <label for="selector" class="text-white relative grow">
                {label}
            </label>
        {/if}

        {#if SLOTS.info}
            <InfoButton>
                <slot name="info" />
            </InfoButton>
        {/if}

        {#if optional}
            <div class="text-xs opacity-50 ">
                {$LL.form.optional()}
            </div>
        {/if}
    </div>
    <Select
        itemId="svelte-select"
        on:filter={handleFilter}
        bind:filterText
        loadOptions={queryOptions}
        on:change={_handleChange}
        on:input={handleChange}
        on:select={handleChange}
        items={filterText.trim().length === 0 ? [] : options}
        bind:value
        multiple={true}
        placeholder={placeholder ?? "Select rights"}
        on:focus={onFocus}
        on:blur={onBlur}
        showChevron={true}
        listAutoWidth={false}
        --clear-select-color="hsl(var(--danger-500))"
        --input-color="white"
        --chevron-icon-colour="white"
        --internal-padding="0px"
        --multi-item-color="hsl(var(--contrast-900))"
        --multi-item-bg="hsl(var(--contrast-200))"
        --multi-select-padding="0 0 0 6px"
        --multi-item-outline="none"
        --padding="0px"
        --list-background="hsl(var(--contrast))"
        --list-empty-color="hsl(var(--contrast-400))"
        --selected-item-color="hsl(var(--contrast-500)) !important"
        --selected-item-padding="0 0 0 32px"
        --list-border-radius="12px"
        --list-border="solid 1px hsl(var(--contrast-400))"
        --list-empty-padding="12px"
        --item-color="hsl(var(--contrast-200))"
        --item-is-active-bg="hsl(var(--contrast-900))"
        --item-is-active-color="hsl(var(--contrast-200))"
        --item-hover-bg="hsl(var(--contrast-900))"
        --item-hover-color="hsl(var(--contrast-200))"
        inputStyles="box-shadow:none !important; margin:0"
        inputAttributes={{ "data-testid": testId }}
        class="!bg-contrast !rounded-md !border-contrast-400 !outline-none !w-full"
    >
        <div slot="item" let:item>
            {item.created ? $LL.notification.addNewTag({ tag: filterText }) : item.label}
        </div>
    </Select>
</div>
