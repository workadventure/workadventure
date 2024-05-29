<script lang="ts">
    import { coWebsites } from "../../Stores/CoWebsiteStore";
    import { createEventDispatcher } from "svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import { popupStore } from "../../Stores/PopupStore";

    const dispatch = createEventDispatcher();
    let isPopupVisible = false;

    coWebsites.subscribe(() => {
        isPopupVisible = !isPopupVisible;
        console.log("cowebsite length woooouhouuuu", $coWebsites.length);
        console.log("isPopupVisible", isPopupVisible);
        if (!isPopupVisible) {
            popupStore.removePopup("popupCopyUrl");
        }
    });

    // if (isPopupVisible) {
    //     setTimeout(() => {
    //         dispatch("close");
    //     }, 3000);
    // }

    function closeBanner() {
        dispatch("close");
    }

    function displayIfCowebsite() {
        // console.log("cowebsite length", $coWebsites.length);
        let popUpCopyUrl = document.getElementById("popup-copyurl");
        if ($coWebsites.length < 1) {
            console.log("no cowebsite");
            if (popUpCopyUrl) {
                popUpCopyUrl.style.display = "none";
            }
        }
    }

    // $: console.log("cowebsite length", $coWebsites.length);
    $: isPopupVisible, displayIfCowebsite();
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
