<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
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
        <button class="btn btn-secondary w-1/2 max-w-80 justify-center responsive-message" on:click={click}>
            Open Tab
        </button>
    </svelte:fragment>
</PopUpContainer>

<style>
    @media (max-width: 768px) {
        .responsive-message {
            font-size: 24px;
            line-height: 32px;
            padding-bottom: 14px;
        }
    }
</style>
