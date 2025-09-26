<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { silentStore } from "../../../Stores/MediaStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";

    import PictureInPictureIcon from "../../Icons/PictureInPictureIcon.svelte";
    import PictureInPictureOffIcon from "../../Icons/PictureInPictureOffIcon.svelte";
    import {
        activePictureInPictureStore,
        askPictureInPictureActivatingStore,
        pictureInPictureSupportedStore
    } from "../../../Stores/PeerStore";
    import {localUserStore} from "../../../Connection/LocalUserStore";

    const dispatch = createEventDispatcher<{
        click: void;
    }>();

    function pictureInPictureClick() {
        // Create request to the navigateur to enter picture in picture mode
        dispatch("click");

        // If the settings of user do not allow picture in picture, we enable it
        if (!localUserStore.getAllowPictureInPicture()) {
            localUserStore.setAllowPictureInPicture(true);
        }

        askPictureInPictureActivatingStore.set(!$askPictureInPictureActivatingStore);
    }
</script>
<ActionBarButton
    classList="group/btn-picture-in-picture"
    disabledHelp={$openedMenuStore !== undefined}
    state={
        $pictureInPictureSupportedStore
        ? ($activePictureInPictureStore ? "active" : "normal")
        : "disabled"
    }
    dataTestId="pictureInPictureButton"
    on:click={pictureInPictureClick}
>
    {#if !$silentStore}
        {#if $activePictureInPictureStore}
            <PictureInPictureOffIcon />
        {:else}
            <PictureInPictureIcon />
        {/if}
    {/if}
</ActionBarButton>