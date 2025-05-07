<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import PopUpContainer from "./PopUpContainer.svelte";

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
    Url copied to clipboard
    <svelte:fragment slot="buttons">
        <button
            class="btn btn-secondary !p-0 w-8 h-8 items-center btn-sm absolute top-2 right-2 z-50 pointer-events-auto"
            on:click={closeBanner}
        >
            <XIcon height="h-4" width="w-4" />
        </button>
    </svelte:fragment>
</PopUpContainer>
