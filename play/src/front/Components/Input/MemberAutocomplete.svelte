<script lang="ts">
    import Select from "svelte-select";
    import { createEventDispatcher } from "svelte";
    import { connectionManager } from "../../Connection/ConnectionManager";

    export let placeholder: string;
    export let value: string | undefined = undefined;

    let selectedValue: { index: number; label: string; value: string } | undefined = value
        ? {
              index: 1,
              label: value,
              value,
          }
        : undefined;

    const dispatch = createEventDispatcher();

    async function searchMembers(filterText: string) {
        try {
            return (await connectionManager.searchMembers(filterText)).map((member, index) => ({
                index,
                value: member.id,
                label: member.email,
            }));
        } catch (error) {
            console.error(error);
        }
        return [];
    }

    function handleSelectOption() {
        dispatch("onSelect", selectedValue?.value ?? "");
    }
</script>

<Select
    bind:value={selectedValue}
    on:change={handleSelectOption}
    itemId="id"
    containerStyles="background-color:unset"
    inputStyles="box-shadow:none !important"
    --border-focused="1px solid rgb(146 142 187)"
    --input-color="white"
    --item-color="black"
    --item-hover-color="black"
    --clear-select-color="red"
    loadOptions={searchMembers}
    {placeholder}
/>
