<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import { helpWebRtcSettingsVisibleStore } from "../../Stores/HelpSettingsStore";
    import { LL } from "../../../i18n/i18n-svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    export let click: () => void;
    export let userInputManager: UserInputManager;

    function refresh() {
        window.location.reload();
    }

    function close() {
        helpWebRtcSettingsVisibleStore.set("hidden");
    }

    onMount(() => {
        userInputManager.addSpaceEventListener(click);
    });

    onDestroy(() => {
        userInputManager.removeSpaceEventListener(click);
    });
</script>

<PopUpContainer reduceOnSmallScreen={true} extraClasses="!bg-[#E96D51]/80">
    {$LL.camera.webrtc.title()}
    <svelte:fragment slot="buttons">
        <button class="btn bg-white/10 hover:bg-white/20 grow" on:click|preventDefault={refresh}
            >{$LL.camera.webrtc.refresh()}</button
        >
        <button type="submit" class="btn btn-danger grow" on:click|preventDefault={close}
            >{$LL.camera.webrtc.continue()}</button
        >
    </svelte:fragment>
</PopUpContainer>
