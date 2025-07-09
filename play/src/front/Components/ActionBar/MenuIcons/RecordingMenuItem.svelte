<script lang="ts">

import { get } from "svelte/store";
import ActionBarButton from "../ActionBarButton.svelte";
import StartRecordingIcon from "../../Icons/StartRecordingIcon.svelte";
import { gameManager } from "../../../Phaser/Game/GameManager";
import {SpaceInterface} from "../../../Space/SpaceInterface";


function requestRecording(): void {
    // This function should handle the recording logic.
    // For now, we just log a message to the console.
    console.log("Recording started");
    const spaceRegistry = gameManager.getCurrentGameScene().spaceRegistry;
    const spaceWithRecording = get(spaceRegistry.spacesWithRecording);
    if (spaceWithRecording.length > 0) {
        const space: SpaceInterface = get(spaceRegistry.spacesWithRecording)[0];
        gameManager.getCurrentGameScene().connection?.emitStartRecording(space.getName());
        console.log("👊👊👊 Emit from button component")
    }

}
</script>

<ActionBarButton
    on:click={() => {
        requestRecording();
    }}
    classList="group/btn-recording"
    tooltipTitle="Recording"
    disabledHelp={true}
    state="normal"
    dataTestId="recordingButton"
    desc="Record your session">

    <StartRecordingIcon/>

</ActionBarButton>
