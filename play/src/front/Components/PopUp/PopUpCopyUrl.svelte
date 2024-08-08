<script lang="ts">
    import { createEventDispatcher, onDestroy } from "svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import { popupStore } from "../../Stores/PopupStore";
    import { coWebsites } from "../../Stores/CoWebsiteStore";

    const dispatch = createEventDispatcher();
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

<div
    id="popup-copyurl"
    class="bg-contrast/80 backdrop-blur text-white w-[300px] h-[150px] rounded-lg overflow-hidden animation responsive"
>
    <div class="flex p-4 space-x-4 pointer-events-auto">
        <div class="" />
        <div class="grow" />
        <div class="" />
        <button class="btn btn-secondary items-center btn-sm" on:click={closeBanner}>
            <XIcon height="h-4" width="w-4" />
        </button>
    </div>
    <p class="text-center -mt-0">Url copied to clipboard</p>
</div>

<!-- <div
    class="relative bg-contrast/80 backdrop-blur text-white w-[250px] h-[150px] rounded-lg overflow-hidden animation responsive"
>

</div> -->
<style>
    .animation {
        animation-duration: 0.5s;
        animation-name: slidein;
    }

    @keyframes slidein {
        from {
            opacity: 0;
        }

        to {
            opacity: 1;
        }
    }

    @media (max-width: 768px) {
        .responsive {
            scale: 0.6;
        }
    }
</style>
