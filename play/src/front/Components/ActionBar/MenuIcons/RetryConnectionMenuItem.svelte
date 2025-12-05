<script lang="ts">
    import { AvailabilityStatus } from "@workadventure/messages";
    import { derived, Readable } from "svelte/store";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import ActionBarButton from "../ActionBarButton.svelte";
    import { availabilityStatusStore, requestedMicrophoneState, silentStore } from "../../../Stores/MediaStore";
    import { openedMenuStore } from "../../../Stores/MenuStore";
    import { IconReload } from "@wa-icons";

    import { gameManager } from "../../../Phaser/Game/GameManager";

    const gameScene = gameManager.getCurrentGameScene();
    const spaceRegistry = gameScene.spaceRegistry;


    function retryConnectionClick(): void {
        analyticsClient.retryConnection();
        spaceRegistry.retryAllFailedConnections();
    }
</script>

<ActionBarButton
    on:click={retryConnectionClick}
    classList="group/btn-mic peer/mic"
    disabledHelp={$openedMenuStore !== undefined}
    state={"normal"}
    dataTestId="microphone-button"
>
    <IconReload />
</ActionBarButton>
