<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { recordingStore, showRecordingList } from "../../../Stores/RecordingStore";
    import StopRecordingIcon from "../../Icons/StopRecordingIcon.svelte";
    import StartRecordingIcon from "../../Icons/StartRecordingIcon.svelte";
    import AppsIcon from "../../Icons/AppsIcon.svelte";
    import PopUpContainer from "../PopUpContainer.svelte";

    let progress = 0;
    let interval: ReturnType<typeof setInterval>;

    onMount(() => {
        const duration = 10000;
        const step = 50;
        let elapsed = 0;

        interval = setInterval(() => {
            elapsed += step;
            progress = Math.min((elapsed / duration) * 100, 100);
            if (elapsed >= duration) {
                clearInterval(interval);
                recordingStore.hideCompletedPopup();
            }
        }, step);
    });

    onDestroy(() => {
        clearInterval(interval);
    });

    function openRecordingList() {
        showRecordingList.set(true);
        recordingStore.hideCompletedPopup();
    }
</script>

<PopUpContainer reduceOnSmallScreen={true} extraClasses="absolute top-0 right-2 z-[999] recording-completed-modal">
    <div class="recording-content" data-testid="recording-completed-modal">
        <!-- Progress bar -->
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: {progress}%" />
        </div>

        <!-- Main content -->
        <div class="flex flex-col gap-4 px-2 py-4">
            <!-- Icon and title -->
            <div class="flex flex-row items-center justify-start gap-4">
                <div class="recording-icon-wrapper">
                    <div class="recording-icon-container completed">
                        <StopRecordingIcon height="h-10" width="w-10" />
                    </div>
                </div>
                <div class="flex flex-col gap-1 flex-1">
                    <p class="recording-title completed">{$LL.recording.notification.recordingComplete()}</p>
                    <p class="recording-subtitle">{$LL.recording.notification.recordingSaved()}</p>
                </div>
            </div>

            <!-- Instructions -->
            <div class="instructions-container">
                <p class="instructions-text">{$LL.recording.notification.howToAccess()}</p>
                <div class="instructions-steps">
                    <div class="step-item">
                        <span class="step-number">1</span>
                        <div class="step-icon">
                            <AppsIcon height="h-5" width="w-5" strokeColor="stroke-white" fillColor="fill-white" />
                        </div>
                        <span class="step-text text-xxs">{$LL.actionbar.help.apps.title()}</span>
                    </div>
                    <div class="step-arrow">→</div>
                    <div class="step-item">
                        <span class="step-number">2</span>
                        <div class="step-icon">
                            <StartRecordingIcon
                                height="h-5"
                                width="w-5"
                                strokeColor="stroke-white"
                                fillColor="fill-white"
                            />
                        </div>
                        <span class="step-text text-xxs">{$LL.recording.recordingList()}</span>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <svelte:fragment slot="buttons">
        <button class="btn btn-ghost btn-sm w-1/2" on:click={() => recordingStore.hideCompletedPopup()}>
            {$LL.recording.close()}
        </button>
        <button class="btn btn-secondary btn-sm w-1/2" on:click={openRecordingList}>
            {$LL.recording.notification.viewRecordings()}
        </button>
    </svelte:fragment>
</PopUpContainer>

<style lang="scss">
    .recording-completed-modal {
        min-width: 360px;
        max-width: 420px;
        border: 1px solid rgba(34, 197, 94, 0.3);
        box-shadow: 0 4px 20px rgba(34, 197, 94, 0.15);
    }

    .recording-content {
        position: relative;
        width: 100%;
    }

    .progress-bar-container {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 3px;
        background: rgba(34, 197, 94, 0.1);
        overflow: hidden;
    }

    .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #22c55e 0%, #16a34a 100%);
        transition: width 0.05s linear;
        box-shadow: 0 0 10px rgba(34, 197, 94, 0.4);
    }

    .recording-icon-wrapper {
        position: relative;
        flex-shrink: 0;
    }

    .recording-icon-container {
        position: relative;
        z-index: 2;
        background: rgba(34, 197, 94, 0.15);
        border-radius: 12px;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(34, 197, 94, 0.3);

        &.completed {
            background: rgba(34, 197, 94, 0.2);
            border-color: rgba(34, 197, 94, 0.4);
        }
    }

    .recording-title {
        font-weight: 600;
        font-size: 16px;
        color: white;
        line-height: 1.4;
        margin: 0;

        &.completed {
            color: #22c55e;
        }
    }

    .recording-subtitle {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.8);
        line-height: 1.3;
        margin: 0;
    }

    .instructions-container {
        background: rgba(255, 255, 255, 0.05);
        border-radius: 8px;
        padding: 12px;
        border: 1px solid rgba(255, 255, 255, 0.1);
    }

    .instructions-text {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.9);
        margin: 0 0 12px 0;
        font-weight: 500;
    }

    .instructions-steps {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-wrap: wrap;
    }

    .step-item {
        display: flex;
        align-items: center;
        gap: 8px;
        background: rgba(255, 255, 255, 0.08);
        padding: 8px 12px;
        border-radius: 6px;
        flex: 1;
        min-width: 120px;
    }

    .step-number {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        background: rgba(34, 197, 94, 0.2);
        color: #22c55e;
        border-radius: 50%;
        font-weight: 600;
        font-size: 12px;
        flex-shrink: 0;
    }

    .step-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
    }

    .step-text {
        color: rgba(255, 255, 255, 0.9);
        font-weight: 500;
    }

    .step-arrow {
        color: rgba(255, 255, 255, 0.5);
        font-size: 18px;
        font-weight: bold;
        flex-shrink: 0;
    }

    @media (max-width: 768px) {
        .recording-completed-modal {
            min-width: 300px;
            max-width: 90vw;
        }

        .recording-title {
            font-size: 15px;
        }

        .recording-subtitle {
            font-size: 12px;
        }

        .instructions-steps {
            flex-direction: column;
            align-items: stretch;
        }

        .step-arrow {
            transform: rotate(90deg);
            align-self: center;
        }

        .step-item {
            min-width: auto;
        }
    }
</style>
