<script lang="ts">
    import { onDestroy } from "svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import Button from "../UI/Button.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";
    import { IconX } from "@wa-icons";

    interface Props {
        onclose?: () => void;
    }

    const { onclose }: Props = $props();

    let isPopupVisible = false;

    const subscription = coWebsites.subscribe(() => {
        isPopupVisible = !isPopupVisible;
        if (!isPopupVisible) {
            popupStore.removePopup("popupCopyUrl");
        }
    });

    function closeBanner() {
        onclose?.();
    }

    onDestroy(() => {
        subscription();
    });
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    {$LL.notification.urlCopiedToClipboard()}
    {#snippet buttons()}
        <Button
            variant="secondary"
            size="sm"
            square
            class="!p-0 w-8 h-8 items-center absolute top-2 right-2 z-50 pointer-events-auto"
            onclick={closeBanner}
        >
            {#snippet icon()}
                <IconX font-size="20" class="text-white" />
            {/snippet}
        </Button>
    {/snippet}
</PopUpContainer>
