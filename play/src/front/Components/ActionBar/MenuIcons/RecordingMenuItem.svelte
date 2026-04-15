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
    import { notificationPlayingStore } from "../../../Stores/NotificationStore";
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

    async function applyRecordingAction(row: RecordingSpaceRow): Promise<void> {
        if (!row.action) {
            return;
        }

        closeSpacePicker();

        const requestState = row.action === "start" ? "starting" : "stopping";
        recordingStore.setRequestState(row.spaceName, requestState);

        try {
            if (row.action === "start") {
                analyticsClient.recordingStart();
                await row.space.startRecording();
            } else {
                analyticsClient.recordingStop();
                await row.space.stopRecording();
            }
        } catch (error) {
            recordingStore.clearRequestState(row.spaceName);
            console.error(`Failed to ${row.action} recording`, error);
            notificationPlayingStore.playNotification(
                row.action === "start"
                    ? get(LL).recording.notification.startFailedNotification()
                    : get(LL).recording.notification.stopFailedNotification()
            );
        }
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
                    applyRecordingAction(row).catch((error) => {
                        console.error(`Failed to apply recording action`, error);
                    });
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

    async function requestRecording(): Promise<void> {
        const state = get(recordingMenuState);

        if (state.actionableRows.length === 0) {
            closeSpacePicker();
            return;
        }

        if (state.directRow) {
            await applyRecordingAction(state.directRow);
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
        requestRecording().catch((error) => {
            console.error(`Failed to request recording`, error);
        });
    }}
    classList="group/btn-recording"
    tooltipTitle={$recordingMenuState.hasOwnRecording
        ? $LL.recording.actionbar.title.stop()
        : $recordingMenuState.hasPendingRequest
        ? $LL.recording.actionbar.title.inProgress()
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
            {:else if $recordingMenuState.hasPendingRequest}
                <div class="text-sm text-white px-2 py-1 flex flex-row gap-2 items-center">
                    <div class="bg-red-500 rounded-full w-4 h-4 max-w-4 max-h-4 animate-pulse" />
                    <div class="text-xs italic opacity-80">
                        {$LL.recording.actionbar.desc.inProgress()}
                    </div>
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
