<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import LL from "../../../i18n/i18n-svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    export let message: string;
    export let click: () => void;
    export let userInputManager: UserInputManager;

    onMount(() => {
        userInputManager.addSpaceEventListener(click);
    });

    onDestroy(() => {
        userInputManager.removeSpaceEventListener(click);
    });
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    {message}
    <svelte:fragment slot="buttons">
        <button class="btn btn-secondary btn-sm w-full max-w-96 justify-center" on:click={click}
            >{$LL.mapEditor.properties.openFileProperties.label()}</button
        >
    </svelte:fragment>
</PopUpContainer>
