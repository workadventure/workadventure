<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import XIcon from "../Icons/XIcon.svelte";

    const dispatch = createEventDispatcher();

    function closeBanner() {
        dispatch("close");
    }
</script>

<!-- <div
    class="absolute top-0 left-50 bg-contrast/80 backdrop-blur text-white left-50 rounded-lg overflow-hidden animation w-[300px] h-[150px]"
>
    <div class="flex p-4 space-x-4 pointer-events-auto">
        <div class="grow" />
        <div class="">

        </div>
    </div>
    <p class="text-center mt-10">Url copied to clipboard</p>
</div> -->

<div
    class="absolute top-0 left-0 bg-contrast/80 backdrop-blur text-white w-[250px] h-[150px] rounded-lg overflow-hidden animation responsive"
>
    <div class="flex flex-col items-center p-4 space-x-4 mt-12 pb-6 bg-contrast pointer-events-auto responsive-bar">
        <button class="btn btn-secondary btn-sm -mb-8 z-[2000] responsive-close-button" on:click={closeBanner}>
            <XIcon height="h-4" width="w-4" />
        </button>
    </div>
</div>

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
