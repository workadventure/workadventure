<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import Button from "../UI/Button.svelte";
    import PopUpContainer from "./PopUpContainer.svelte";

    interface Props {
        message: string;
        click: () => void;
        userInputManager: UserInputManager;
    }

    let { message, click, userInputManager }: Props = $props();

    onMount(() => {
        userInputManager.addSpaceEventListener(click);
    });

    onDestroy(() => {
        userInputManager.removeSpaceEventListener(click);
    });
</script>

<PopUpContainer reduceOnSmallScreen={true}>
    {message}
    {#snippet buttons()}
        <Button variant="secondary" size="sm" class="w-full max-w-96" onclick={click}>Enter Jitsi</Button>
    {/snippet}
</PopUpContainer>
