<script lang="ts">
    import { getAdditionalMenuItemStore } from "../../../Stores/AdditionalItemsMenuStore";
    import CustomActionBarButton from "./CustomActionBarButton.svelte";

    interface Props {
        menu: "appsMenu" | "buildMenu" | "profileMenu";
    }

    let { menu }: Props = $props();

    let additionalMenuStore = $derived(getAdditionalMenuItemStore(menu));
</script>

{#each [...$additionalMenuStore.values()] as additionalMenuItemProps (additionalMenuItemProps.id)}
    <CustomActionBarButton button={additionalMenuItemProps} />
{/each}
