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
        userInputManager.addInteractEventListener(onclick);
    });

    onDestroy(() => {
        userInputManager.removeInteractEventListener(onclick);
    });
</script>

<PopUpContainer reduceOnSmallScreen={true} {onclick}>
    {message}
</PopUpContainer>
