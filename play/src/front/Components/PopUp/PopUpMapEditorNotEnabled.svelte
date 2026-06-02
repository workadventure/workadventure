<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import PopUpContainer from "./PopUpContainer.svelte";

    interface Props {
        message: string;
        onclick: () => void;
        userInputManager: UserInputManager;
    }

    let { message, onclick, userInputManager }: Props = $props();

    onMount(() => {
        userInputManager.addSpaceEventListener(onclick);
    });

    onDestroy(() => {
        userInputManager.removeSpaceEventListener(onclick);
    });
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    {message}
    {#snippet buttons()}
        <button class="btn btn-secondary w-1/2 justify-center responsive-message" {onclick}>Close</button>
    {/snippet}
</PopUpContainer>

<style>
    @media (max-width: 768px) {
        .responsive-message {
            scale: 1.2;
        }
    }
</style>
