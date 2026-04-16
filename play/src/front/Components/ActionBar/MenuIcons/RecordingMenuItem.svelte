<script lang="ts">
    import type { Readable } from "svelte/store";
    import { onDestroy } from "svelte";
    import { derived, get } from "svelte/store";
    import { LL } from "../../../../i18n/i18n-svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import RecordingIcon from "../../Icons/RecordingIcon.svelte";
    import RecordingActiveIcon from "../../Icons/RecordingActiveIcon.svelte";
    import { recordingStore } from "../../../Stores/RecordingStore";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import RecordingSpacePicker from "../../PopUp/Recording/RecordingSpacePicker.svelte";
    import type { RecordingMenuState, RecordingSpaceRow } from "./RecordingMenuUtils";
    import { IconAlertTriangle } from "@wa-icons";

    export let recordingMenuState: Readable<RecordingMenuState>;

    const recording = gameManager.currentStartedRoom.recording;
    let closeFloatingUi: (() => void) | undefined = undefined;
    let triggerElement: HTMLElement | undefined = undefined;

    function closeSpacePicker(): void {
        closeFloatingUi?.();
        closeFloatingUi = undefined;
    }

    function applyRecordingAction(row: RecordingSpaceRow): void {
        if (!row.action) {
            return;
        }

        closeSpacePicker();

        if (row.action === "start") {
            analyticsClient.recordingStart();
            recordingStore.setRequestState(row.spaceName, "starting");
        } else {
            analyticsClient.recordingStop();
            recordingStore.setRequestState(row.spaceName, "stopping");
        }

        row.space.emitUpdateSpaceMetadata(
            new Map([
                [
                    "recording",
                    {
                        recording: row.action === "start",
                    },
                ],
            ])
        );
    }

    function openSpacePicker(): void {
        if (closeFloatingUi) {
            closeSpacePicker();
            return;
        }

        if (!triggerElement) {
            return;
        }

        closeFloatingUi = showFloatingUi(
            triggerElement,
            RecordingSpacePicker,
            {
                rowsStore: derived(recordingMenuState, ($state) => $state.currentRows),
                onSelect: (row: RecordingSpaceRow) => {
                    applyRecordingAction(row);
                },
                onClose: closeSpacePicker,
            },
            {
                placement: "bottom",
            },
            8,
            true
        );
    }

    function requestRecording(): void {
        const state = get(recordingMenuState);

        if (state.actionableRows.length === 0) {
            closeSpacePicker();
            return;
        }

        if (state.directRow) {
            applyRecordingAction(state.directRow);
            return;
        }

        openSpacePicker();
    }

    onDestroy(() => {
        closeSpacePicker();
    });
</script>

<ActionBarButton
    on:click={() => {
        requestRecording();
    }}
    classList="group/btn-recording"
    tooltipTitle={$recordingMenuState.hasOwnRecording
        ? $LL.recording.actionbar.title.stop()
        : $recordingMenuState.hasActionableStart
        ? $LL.recording.actionbar.title.start()
        : $recordingMenuState.hasOtherRecording
        ? $LL.recording.actionbar.title.inProgress()
        : $LL.recording.actionbar.title.start()}
    state={$recordingMenuState.buttonState}
    dataTestId="recordingButton-{$recordingMenuState.actionMode}"
    media="./static/Videos/Record.mp4"
    tooltipDelay={0}
    bind:wrapperDiv={triggerElement}
>
    {#if $recordingMenuState.hasOwnRecording}
        <RecordingActiveIcon width="40" height="40" />
    {:else}
        <RecordingIcon
            status={$recordingMenuState.hasPendingRequest || $recordingMenuState.hasOtherRecording ? "active" : "idle"}
        />
    {/if}

    <div slot="tooltip" class="text-white relative">
        <div>
            {#if !localUserStore.isLogged()}
                <div class="text-xs italic opacity-80">
                    {$LL.recording.actionbar.desc.needLogin()}
                </div>
            {:else if !$recordingMenuState.hasOwnRecording && recording?.buttonState === "disabled" && recording?.disabledReason}
                <div class="text-xs italic opacity-80">
                    {recording.disabledReason}
                </div>
            {:else if $recordingMenuState.actionableRows.some((row) => row.action === "start")}
                <div class="text-sm text-whitepx-2 py-1">
                    <span class="mr-2 -translate-y-1">
                        <IconAlertTriangle />
                    </span>
                    <span class="text-xs italic opacity-80">
                        {$LL.recording.actionbar.desc.advert()}
                    </span>
                </div>
            {:else if $recordingMenuState.hasOwnRecording}
                <div class="text-sm text-white flex flex-row items-center gap-2 px-2 py-1">
                    <div class="bg-red-500 rounded-full min-w-4 min-h-4 animate-pulse" />
                    <div class="text-xs italic opacity-80">
                        {$LL.recording.actionbar.desc.yourRecordInProgress()}
                    </div>
                </div>
            {:else}
                <div class="text-sm text-white px-2 py-1 flex flex-row gap-2 items-center">
                    <div class="bg-red-500 rounded-full w-4 h-4 max-w-4 max-h-4 animate-pulse" />
                    <div class="text-xs italic opacity-80">
                        {$LL.recording.actionbar.desc.inProgress()}
                    </div>
                </div>
            {/if}
        </div>
    </div>
</ActionBarButton>
