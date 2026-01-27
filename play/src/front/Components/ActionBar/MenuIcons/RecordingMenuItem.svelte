<script lang="ts">
    import { get } from "svelte/store";
    import { LL } from "../../../../i18n/i18n-svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import StartRecordingIcon from "../../Icons/StartRecordingIcon.svelte";
    import StopRecordingIcon from "../../Icons/StopRecordingIcon.svelte";
    import { recordingStore } from "../../../Stores/RecordingStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import type { SpaceInterface } from "../../../Space/SpaceInterface";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { IconAlertTriangle } from "@wa-icons";

    const currentGameScene = gameManager.getCurrentGameScene();

    const recording = gameManager.currentStartedRoom.recording;
    let waitReturnOfRecordingRequest = false;

    function requestRecording(): void {
        const spaceRegistry = currentGameScene.spaceRegistry;
        const spaceWithRecording = get(spaceRegistry.spacesWithRecording);
        if (spaceWithRecording.length > 0) {
            const isRecording = get(recordingStore).isRecording;
            const space: SpaceInterface = get(spaceRegistry.spacesWithRecording)[0];

            if (isRecording) {
                space.emitUpdateSpaceMetadata(
                    new Map([
                        [
                            "recording",
                            {
                                recording: false,
                            },
                        ],
                    ])
                );

                waitReturnOfRecordingRequest = false;
            } else {
                space.emitUpdateSpaceMetadata(
                    new Map([
                        [
                            "recording",
                            {
                                recording: true,
                            },
                        ],
                    ])
                );

                waitReturnOfRecordingRequest = true;
            }
        }
    }

    $: if ($recordingStore.isRecording) {
        waitReturnOfRecordingRequest = false;
    }

    $: buttonState = ((): "disabled" | "normal" | "active" => {
        if (!localUserStore.isLogged() || recording?.buttonState !== "enabled" || waitReturnOfRecordingRequest)
            return "disabled";
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
            ? $LL.recording.actionbar.title.stop()
            : $LL.recording.actionbar.title.inpProgress()
        : $LL.recording.actionbar.title.start()}
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
                        {$LL.recording.actionbar.desc.needLogin()}
                    </span>
                </div>
            {:else if recording?.buttonState === "disabled" && recording?.disabledReason}
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <span>
                        {recording.disabledReason}
                    </span>
                </div>
            {:else if !$recordingStore.isRecording}
                <div class="text-sm text-white bg-white/10 rounded px-2 py-1 backdrop-blur">
                    <span class="mr-2 -translate-y-1">
                        <IconAlertTriangle />
                    </span>
                    <span>
                        {$LL.recording.actionbar.desc.advert()}
                    </span>
                </div>
            {:else if $recordingStore.isCurrentUserRecorder}
                <div class="text-sm text-white flex flex-row items-center gap-2 px-2 py-1">
                    <div class="bg-red-500 rounded-full min-w-4 min-h-4 animate-pulse" />
                    <div>
                        {$LL.recording.actionbar.desc.yourRecordInProgress()}
                    </div>
                </div>
            {:else}
                <div class="text-sm text-white px-2 py-1 flex flex-row gap-2 items-center">
                    <div class="bg-red-500 rounded-full w-4 h-4 max-w-4 max-h-4 animate-pulse" />
                    <div>
                        {$LL.recording.actionbar.desc.inProgress()}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</ActionBarButton>
