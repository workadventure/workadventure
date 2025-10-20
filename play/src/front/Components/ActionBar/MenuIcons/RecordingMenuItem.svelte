<script lang="ts">
    import { get } from "svelte/store";
    import { isRoomMetadataData, RoomMetadataData } from "@workadventure/messages/src/JsonMessages/RoomMetadata";
    import { LL } from "../../../../i18n/i18n-svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import StartRecordingIcon from "../../Icons/StartRecordingIcon.svelte";
    import StopRecordingIcon from "../../Icons/StopRecordingIcon.svelte";
    import { recordingStore } from "../../../Stores/RecordingStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { SpaceInterface } from "../../../Space/SpaceInterface";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { userIsAdminStore } from "../../../Stores/GameStore";
    import { IconAlertTriangle } from "@wa-icons";

    const currentGameScene = gameManager.getCurrentGameScene();
    const roomMetadataChecking = isRoomMetadataData.safeParse(gameManager.currentStartedRoom.metadata);
    if (!roomMetadataChecking.success) {
        console.error("Invalid room metadata data", roomMetadataChecking.error, roomMetadataChecking.data);
        throw new Error(`Invalid room metadata data ${roomMetadataChecking.data}`);
    }
    const roomMetadata: RoomMetadataData = roomMetadataChecking.data;
    const roomEnabledRecording = roomMetadata.room.enableRecord;
    const isPremium = roomMetadata.room.isPremium;
    let waitReturnOfRecordingRequest = false;

    function requestRecording(): void {
        const spaceRegistry = currentGameScene.spaceRegistry;
        const spaceWithRecording = get(spaceRegistry.spacesWithRecording);
        if (spaceWithRecording.length > 0) {
            const isRecording = get(recordingStore).isRecording;
            const space: SpaceInterface = get(spaceRegistry.spacesWithRecording)[0];

            if (isRecording) {
                space.emitUpdateSpaceMetadata(new Map([["recording", {
                    recording: false,
                }]]));  

                waitReturnOfRecordingRequest = false; 
            } else {
                space.emitUpdateSpaceMetadata(new Map([["recording", {
                    recording: true,
                }]]));

                waitReturnOfRecordingRequest = true; 
            }
        }
    }

    $: if($recordingStore.isRecording){
        waitReturnOfRecordingRequest = false; 
    }

    $: buttonState = ((): "disabled" | "normal" | "active" => {
        
        if (!localUserStore.isLogged() || !$userIsAdminStore || !isPremium || !roomEnabledRecording || waitReturnOfRecordingRequest ) return "disabled";
        if ($recordingStore.isCurrentUserRecorder) return "active";
        if (!$recordingStore.isRecording) return "normal";
        return "disabled";
    })();
</script>

<ActionBarButton
    on:click={() => {
        requestRecording();
    }}
    classList="group/btn-recording"
    tooltipTitle={$recordingStore.isRecording
        ? $recordingStore.isCurrentUserRecorder
            ? $LL.recording.actionbar.help.desc.stop()
            : $LL.recording.actionbar.help.desc.inProgress()
        : $LL.recording.actionbar.help.desc.start()}
    state={buttonState}
    dataTestId="recordingButton-{$recordingStore.isRecording ? 'stop' : 'start'}"
    tooltipDelay={0}
>
    {#if $recordingStore.isRecording && $recordingStore.isCurrentUserRecorder}
        <StopRecordingIcon />
    {:else if waitReturnOfRecordingRequest}
        <div class="bg-red-500 rounded-full w-4 h-4 max-w-4 max-h-4 animate-pulse" />
    {:else}
        <StartRecordingIcon />
    {/if}

    <div slot="tooltip" class="text-white relative">
        <div>
            {#if !localUserStore.isLogged()}
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <span>
                        {$LL.actionbar.help.recording.desc.needLogin()}
                    </span>
                </div>
            {:else if !isPremium}
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <span>
                        {$LL.actionbar.help.recording.desc.needPremium()}
                    </span>
                </div>
            {:else if !roomEnabledRecording}
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <span>
                        {$LL.actionbar.help.recording.desc.notEnabled()}
                    </span>
                </div>
            {:else if !$recordingStore.isRecording}
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <span class="mr-2 -translate-y-1">
                        <IconAlertTriangle />
                    </span>
                    <span>
                        {$LL.actionbar.help.recording.desc.advert()}
                    </span>
                </div>
            {:else if $recordingStore.isCurrentUserRecorder}
                <div class="text-sm text-white flex flex-row items-center gap-2 px-2 py-1">
                    <div class="bg-red-500 rounded-full min-w-4 min-h-4 animate-pulse" />
                    <div>
                        {$LL.actionbar.help.recording.desc.yourRecordInProgress()}
                    </div>
                </div>
            {:else}
                <div class="text-sm text-white px-2 py-1 flex flex-row gap-2 items-center">
                    <div class="bg-red-500 rounded-full w-4 h-4 max-w-4 max-h-4 animate-pulse" />
                    <div>
                        {$LL.actionbar.help.recording.desc.inProgress()}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</ActionBarButton>
