<script lang="ts">
    import Select from "svelte-select";
    import { createEventDispatcher } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";

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
        const connection = gameManager.getCurrentGameScene().connection;
        if (connection) {
            try {
                return (await connection.queryMembers(filterText)).map((member, index) => ({
                    index,
                    value: member.id,
                    label: member.email,
                }));
            } catch (error) {
                console.error(error);
            }
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
    inputAttributes={{ "data-testid": "memberAutoCompleteInput" }}
    {placeholder}
/>
