<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import * as Sentry from "@sentry/svelte";
    import Select from "svelte-select";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { searchChatMembersRule, SelectItem } from "./Room/searchChatMembersRule";
    export let value: SelectItem[] = [];
    export let placeholder = "";
    export let filterText = "";

    let items: SelectItem[] = [];
    const chat = gameManager.chatConnection;

    const dispatch = createEventDispatcher();
    const { searchWorldMembers } = searchChatMembersRule();

    function handleFilter(e: CustomEvent) {
        if (value?.find((i) => i.label === filterText)) return;
        if (e.detail.length === 0 && filterText.length > 0) {
            const prev = items.filter((i) => !i.created);
            items = [...prev, { value: filterText, label: filterText, created: true }];
        }
    }

    async function handleChange() {
        const verificationResults = await Promise.all(
            value.map(async (item) => {
                if (item.verified !== undefined) {
                    return { item, isValid: item.verified };
                }
                try {
                    const isValid = await chat.isUserExist(item.value);
                    return { item, isValid };
                } catch (error) {
                    console.error(error);
                    return { item, isValid: false };
                }
            })
        );

        const validItems = verificationResults
            .filter(({ isValid }) => isValid)
            .map(({ item }) => ({ ...item, verified: true }));

        const hasInvalidItems = verificationResults.some(({ isValid }) => !isValid);
        if (hasInvalidItems) {
            dispatch("error", { error: "User not found" });
        }

        return validItems;
    }

    onMount(() => {
        searchWorldMembers(filterText)
            .then((newItems) => {
                items = newItems;
            })
            .catch((error) => {
                dispatch("error", { error: "Failed to load users" });
                console.error(error);
                Sentry.captureException(error);
            });
    });
</script>

<Select
    bind:value
    multiple
    class="!tw-border-light-purple tw-border tw-border-solid !tw-bg-contrast !tw-rounded-xl"
    inputStyles="box-shadow:none !important"
    --border-focused="2px solid rgb(146 142 187)"
    --input-color="white"
    --item-color="black"
    --item-hover-color="black"
    --clear-select-color="red"
    {placeholder}
    on:change={async () => {
        const validItems = await handleChange();
        value = validItems;
    }}
    on:filter={handleFilter}
    bind:filterText
    {items}
>
    <div slot="item" let:item>
        {item.created ? $LL.chat.addNew : ""}
        {`${item.label} (${item.value})`}
    </div>
</Select>
