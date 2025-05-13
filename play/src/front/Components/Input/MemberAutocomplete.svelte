<script lang="ts">
    import Select from "svelte-select";
    import { createEventDispatcher } from "svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";

    export let placeholder: string;
    export let value: string | undefined | null = undefined;

    let selectedValue: { index: number; label: string; value: string } | undefined = value
        ? {
              index: 1,
              label: value,
              value,
          }
        : undefined;

    const dispatch = createEventDispatcher<{
        onSelect: { index: number; label: string; value: string };
    }>();

    async function searchMembers(filterText: string) {
        const connection = gameManager.getCurrentGameScene().connection;
        if (connection) {
            try {
                return (await connection.queryMembers(filterText)).map((member, index) => ({
                    index,
                    value: member.id,
                    label: member.name
                        ? `${member.name} ${member.email ? `(${member.email})` : ""}`
                        : member.email
                        ? member.email
                        : member.id,
                }));
            } catch (error) {
                console.error(error);
            }
        }
        return [];
    }

    function handleSelectOption() {
        if (selectedValue) {
            dispatch("onSelect", selectedValue);
        }
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
    class="!bg-contrast !rounded-md !border-contrast-400 !outline-none !w-full"
/>
