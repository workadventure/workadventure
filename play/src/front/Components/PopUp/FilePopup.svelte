<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import type { UserInputManager } from "../../Phaser/UserInput/UserInputManager";
    import LL from "../../../i18n/i18n-svelte";
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
        <button class="btn btn-secondary btn-sm w-full max-w-96 justify-center" onclick={click}>
            {$LL.mapEditor.properties.openFile.label()}
        </button>
    {/snippet}
</PopUpContainer>
