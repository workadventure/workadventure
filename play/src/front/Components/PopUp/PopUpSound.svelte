<script lang="ts">
    import AudioManager from "../AudioManager/AudioManager.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";
</script>

<PopUpContainer>
    <AudioManager />
    <svelte:fragment slot="buttons">
        <button class="btn btn-secondary btn-sm w-1/2 justify-center" id="buttonPopup"> Reduce Popup Sound </button>
    </svelte:fragment>
</PopUpContainer>

<style>
</style>
