<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import XIcon from "../Icons/XIcon.svelte";
    import FollowMenu from "../FollowMenu/FollowMenu.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    const dispatch = createEventDispatcher();

    function closeBanner() {
        dispatch("close");
    }
</script>

<PopUpContainer>
    <FollowMenu />
    <svelte:fragment slot="iconButton">
        <button
            class="btn btn-secondary !p-0 w-8 h-8 items-center btn-sm absolute top-2 right-2 z-50 pointer-events-auto"
            on:click={closeBanner}
        >
            <XIcon height="h-4" width="w-4" />
        </button>
    </svelte:fragment>
</PopUpContainer>

<style>
    @media screen and (max-width: 480px) {
        .responsive-close-button {
            display: none;
        }
    }
</style>
