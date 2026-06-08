<script lang="ts">
    import Select from "svelte-select";
    import { gameManager } from "../../Phaser/Game/GameManager";

    interface Props {
        placeholder: string;
        value?: string | null;
        select?: (value: { index: number; label: string; value: string }) => void;
    }

    let { placeholder, value = undefined, select = () => {} }: Props = $props();

    let selectedValue: { index: number; label: string; value: string } | undefined = $state(
        (() =>
            value
                ? {
                      index: 1,
                      label: value,
                      value,
                  }
                : undefined)(),
    );

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
            select(selectedValue);
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
