<script lang="ts">

    import { get } from "svelte/store";
    import ActionBarButton from "../ActionBarButton.svelte";
    import StartRecordingIcon from "../../Icons/StartRecordingIcon.svelte";
    import StopRecordingIcon from "../../Icons/StopRecordingIcon.svelte";
    import { recordingStore } from "../../../Stores/RecordingStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { SpaceInterface } from "../../../Space/SpaceInterface";
    import { IconAlertTriangle } from "@wa-icons";
    import { isRoomMetadataData, RoomMetadataData } from "@workadventure/messages/src/JsonMessages/RoomMetadata";
    import { localUserStore } from "../../../Connection/LocalUserStore";

    const currentGameScene = gameManager.getCurrentGameScene();
    const roomMetadataChecking = isRoomMetadataData.safeParse(gameManager.currentStartedRoom.metadata);
    if (!roomMetadataChecking.success) {
        throw new Error("Invalid room metadata data");
    }
    const roomMetadata: RoomMetadataData = roomMetadataChecking.data;
    const isPremium = roomMetadata.room.isPremium;



    function requestRecording(): void {
        console.log("Recording started");
        const spaceRegistry = currentGameScene.spaceRegistry;
        const spaceWithRecording = get(spaceRegistry.spacesWithRecording);
        if (spaceWithRecording.length > 0) {
            const isRecording = get(recordingStore).isRecording;
            const space: SpaceInterface = get(spaceRegistry.spacesWithRecording)[0];
            if (isRecording) {
                gameManager.getCurrentGameScene().connection?.emitStopRecording(space.getName());
                console.log("👊👊👊 Emit stop recording from button component");
            } else {
                gameManager.getCurrentGameScene().connection?.emitStartRecording(space.getName());
                console.log("👊👊👊 Emit from button component")
            }
        }
    }


</script>

<ActionBarButton
    on:click={() => {
        requestRecording();
    }}
    classList="group/btn-recording"
    tooltipTitle={ $recordingStore.isRecording ?
        $recordingStore.isCurrentUserRecorder ? "Stop recording" : "A recording is in progress"
        : "Start a recording"
    }
    state={ localUserStore.isLogged() ? (isPremium ? ($recordingStore.isRecording ? ($recordingStore.isCurrentUserRecorder ? "active" : "disabled") : "normal") : "disabled") : "disabled" }
    dataTestId="recordingButton"
    tooltipDelay={0}
>

    {#if $recordingStore.isRecording && $recordingStore.isCurrentUserRecorder }
        <StopRecordingIcon/>
    {:else}
        <StartRecordingIcon/>
    {/if}

    <div slot="tooltip" class="text-white relative">
        <div>
            {#if !localUserStore.isLogged()}
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <span>
                        You need to be logged to record.
                    </span>
                </div>
            {:else if !isPremium}
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <span>
                        You need to be premium to record.
                    </span>
                </div>
            {:else if !$recordingStore.isRecording }
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <IconAlertTriangle />
                    <span>
                        All participants will be notified that you are starting a recording.
                    </span>
                </div>
            {:else if $recordingStore.isCurrentUserRecorder}
                <div class="text-sm text-white flex flex-row items-center gap-2 px-2 py-1 ">
                    <div class="bg-red-500 rounded-full min-w-4 min-h-4 animate-pulse"></div>
                    <div>
                        Your recording is in progress. Click to stop it.
                    </div>
                </div>
            {:else}
                <div class="text-sm text-white px-2 py-1 flex flex-rox gap-2 items-center">
                    <div class="bg-red-500 rounded-full w-4 h-4 max-w-4 max-h-4 animate-pulse"></div>
                    <div>
                        A recording is in progress.
                    </div>
                </div>
            {/if}
        </div>
    </div>

</ActionBarButton>
