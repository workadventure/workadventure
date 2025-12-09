<script lang="ts">
    import { getAdditionalMenuItemStore } from "../../../Stores/AdditionalItemsMenuStore";
    import CustomActionBarButton from "./CustomActionBarButton.svelte";

    export let menu: "appsMenu" | "buildMenu" | "profileMenu";

    const additionalMenuStore = getAdditionalMenuItemStore(menu);
</script>

{#each [...$additionalMenuStore.values()] as additionalMenuItemProps (additionalMenuItemProps.id)}
    <CustomActionBarButton button={additionalMenuItemProps} />
{/each}
