<script lang="ts">
    import { onDestroy } from "svelte";
    import { writable } from "svelte/store";
    import { LL } from "../../../../i18n/i18n-svelte";
    import ActionBarButton from "../ActionBarButton.svelte";
    import RecordingIcon from "../../Icons/RecordingIcon.svelte";
    import RecordingActiveIcon from "../../Icons/RecordingActiveIcon.svelte";
    import { recordingStore } from "../../../Stores/RecordingStore";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { localUserStore } from "../../../Connection/LocalUserStore";
    import { analyticsClient } from "../../../Administration/AnalyticsClient";
    import { showFloatingUi } from "../../../Utils/svelte-floatingui-show";
    import RecordingSpacePicker from "../../PopUp/Recording/RecordingSpacePicker.svelte";
    import type { RecordingSpaceRow } from "./RecordingMenuUtils";
    import {
        getActionableRecordingRows,
        getDirectRecordingActionRow,
        getRecordingSpaceRows,
    } from "./RecordingMenuUtils";
    import { IconAlertTriangle } from "@wa-icons";

    const currentGameScene = gameManager.getCurrentGameScene();
    const spacesWithRecordingStore = currentGameScene.spaceRegistry.spacesWithRecording;
    const recording = gameManager.currentStartedRoom.recording;
    const pickerRowsStore = writable<RecordingSpaceRow[]>([]);
    let closeFloatingUi: (() => void) | undefined = undefined;
    let triggerElement: HTMLElement | undefined = undefined;
    const roomAllowsStart = localUserStore.isLogged() && recording?.buttonState === "enabled";

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
                rowsStore: pickerRowsStore,
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
        if (actionableRows.length === 0) {
            closeSpacePicker();
            return;
        }

        const directRow = getDirectRecordingActionRow(currentRows);
        if (directRow) {
            applyRecordingAction(directRow);
            return;
        }

        openSpacePicker();
    }

    $: currentRows = getRecordingSpaceRows(
        currentGameScene.spaceRegistry.getAll(),
        $spacesWithRecordingStore,
        $recordingStore,
        roomAllowsStart
    );
    $: pickerRowsStore.set(currentRows);
    $: actionableRows = getActionableRecordingRows(currentRows);
    $: hasActionableStart = actionableRows.some((row) => row.action === "start");
    $: hasOwnRecording = currentRows.some((row) => row.status === "recording-self");
    $: hasOtherRecording = currentRows.some((row) => row.status === "recording-other");
    $: hasPendingRequest = currentRows.some((row) => row.status === "starting" || row.status === "stopping");
    $: actionMode = hasOwnRecording ? "stop" : "start";

    onDestroy(() => {
        closeSpacePicker();
    });

    $: buttonState = ((): "disabled" | "normal" | "active" => {
        if (!localUserStore.isLogged()) {
            return "disabled";
        }
        if (actionableRows.length > 0) {
            return hasOwnRecording ? "active" : "normal";
        }
        if (hasOwnRecording) {
            return "active";
        }
        return "disabled";
    })();
</script>

<ActionBarButton
    on:click={() => {
        requestRecording();
    }}
    classList="group/btn-recording"
    tooltipTitle={hasOwnRecording
        ? $LL.recording.actionbar.title.stop()
        : hasActionableStart
        ? $LL.recording.actionbar.title.start()
        : hasOtherRecording
        ? $LL.recording.actionbar.title.inProgress()
        : $LL.recording.actionbar.title.start()}
    state={buttonState}
    dataTestId="recordingButton-{actionMode}"
    media="./static/Videos/Record.mp4"
    tooltipDelay={0}
    bind:wrapperDiv={triggerElement}
>
    {#if hasOwnRecording}
        <RecordingActiveIcon width="40" height="40" />
    {:else}
        <RecordingIcon status={hasPendingRequest || hasOtherRecording ? "active" : "idle"} />
    {/if}

    <div slot="tooltip" class="text-white relative">
        <div>
            {#if !localUserStore.isLogged()}
                <div class="text-xs italic opacity-80">
                    {$LL.recording.actionbar.desc.needLogin()}
                </div>
            {:else if !hasOwnRecording && recording?.buttonState === "disabled" && recording?.disabledReason}
                <div class="text-xs italic opacity-80">
                    {recording.disabledReason}
                </div>
            {:else if actionableRows.some((row) => row.action === "start")}
                <div class="text-sm text-whitepx-2 py-1">
                    <span class="mr-2 -translate-y-1">
                        <IconAlertTriangle />
                    </span>
                    <span class="text-xs italic opacity-80">
                        {$LL.recording.actionbar.desc.advert()}
                    </span>
                </div>
            {:else if hasOwnRecording}
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
