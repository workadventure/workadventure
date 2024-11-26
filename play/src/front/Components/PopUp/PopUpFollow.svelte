<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import FollowMenu from "../FollowMenu/FollowMenu.svelte";

    const dispatch = createEventDispatcher();

    function closeBanner() {
        dispatch("close");
    }
</script>

<div class="bg-contrast/80 backdrop-blur text-white rounded-lg overflow-hidden animation w-[400px] h-[100px]">
    <div class="flex p-4 space-x-4 pointer-events-auto">
        <div class="">
            <button class="btn btn-light btn-sm -mb-8 z-[2000] responsive-close-button" on:click={closeBanner}>
                <XIcon height="h-4" width="w-4" />
            </button>
            <div class="">
                <FollowMenu />
            </div>
        </div>
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

    @media screen and (max-width: 480px) {
        .responsive-close-button {
            display: none;
        }
    }
</style>
