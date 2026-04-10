<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import LL from "../../../i18n/i18n-svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import PopUpContainer from "./PopUpContainer.svelte";
    import { IconX } from "@wa-icons";

    const dispatch = createEventDispatcher<{
        close: void;
    }>();
    let isPopupVisible = false;

    const subscription = coWebsites.subscribe(() => {
        isPopupVisible = !isPopupVisible;
        if (!isPopupVisible) {
            popupStore.removePopup("popupCopyUrl");
        }
    });

    function closeBanner() {
        dispatch("close");
    }

    onDestroy(() => {
        subscription();
    });
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    {$LL.notification.urlCopiedToClipboard()}
    <svelte:fragment slot="buttons">
        <button
            class="btn btn-secondary !p-0 w-8 h-8 items-center btn-sm absolute top-2 right-2 z-50 pointer-events-auto"
            on:click={closeBanner}
        >
            <IconX font-size="20" class="text-white" />
        </button>
    </svelte:fragment>
</PopUpContainer>
