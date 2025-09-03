<script lang="ts">
    import { onMount, createEventDispatcher } from "svelte";
    import * as Sentry from "@sentry/svelte";
    import Select from "svelte-select";
    import LL from "../../../i18n/i18n-svelte";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import UsersIcon from "../../Components/Icons/UsersIcon.svelte";
    import { searchChatMembersRule, SelectItem } from "./Room/searchChatMembersRule";
    export let value: SelectItem[] = [];
    export let placeholder = "";
    export let filterText = "";

    let items: SelectItem[] = [];
    const chat = gameManager.chatConnection;

    const dispatch = createEventDispatcher<{
        error: { error: string };
    }>();
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
    class="border border-solid !bg-contrast !rounded-md"
    inputStyles="box-shadow:none !important"
    --border-focused="2px solid hsl(var(--secondary-600))"
    --border-hover="1px solid hsl(var(--secondary-500))"
    --input-color="white"
    --border="1px solid hsl(var(--contrast-400))"
    --clear-select-color="hsl(var(--danger-500))"
    --internal-padding="6px"
    --value-container-padding="6px"
    --multi-select-input-padding="0 0 0 6px"
    --multi-item-color="hsl(var(--contrast-900))"
    --multi-item-bg="hsl(var(--contrast-200))"
    --multi-select-padding="0 0 0 6px"
    --multi-item-outline="none"
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
    --placeholder-color="hsl(var(--contrast-400))"
    ----padding="8px"
    {placeholder}
    on:change={async () => {
        const validItems = await handleChange();
        value = validItems;
    }}
    on:filter={handleFilter}
    bind:filterText
    {items}
>
    <div slot="prepend" class="ps-2">
        <UsersIcon />
    </div>
    <div slot="item" let:item class="cursor-pointer">
        {item.created ? $LL.chat.addNew : ""}
        {`${item.label} (${item.value})`}
    </div>
</Select>
