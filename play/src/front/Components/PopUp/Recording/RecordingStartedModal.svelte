<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { LL } from "../../../../i18n/i18n-svelte";
    import { recordingStore } from "../../../Stores/RecordingStore";
    import StartRecordingIcon from "../../Icons/StartRecordingIcon.svelte";
    import PopUpContainer from "../PopUpContainer.svelte";

    let progress = 0;
    let interval: ReturnType<typeof setInterval>;

    onMount(() => {
        const duration = 5000;
        const step = 50;
        let elapsed = 0;

        interval = setInterval(() => {
            elapsed += step;
            progress = Math.min((elapsed / duration) * 100, 100);
            if (elapsed >= duration) {
                clearInterval(interval);
                recordingStore.hideInfoPopup();
            }
        }, step);
    });

    onDestroy(() => {
        clearInterval(interval);
    });
</script>

<PopUpContainer reduceOnSmallScreen={true} extraClasses="absolute top-0 right-2 z-[999] recording-modal">
    <div class="recording-content" data-testid="recording-started-modal">
        <!-- Progress bar -->
        <div class="progress-bar-container">
            <div class="progress-bar" style="width: {progress}%" />
        </div>

        <!-- Main content -->
        <div class="flex flex-row items-center justify-start gap-4 px-2 py-3">
            <!-- Recording icon with pulse animation -->
            <div class="recording-icon-wrapper">
                <div class="recording-pulse" />
                <div class="recording-icon-container">
                    <StartRecordingIcon
                        height="h-10"
                        width="w-10"
                        strokeColor="stroke-red-500"
                        fillColor="fill-red-500"
                    />
                </div>
            </div>

            <!-- Text content -->
            <div class="flex flex-col gap-1 flex-1">
                <p class="recording-title">{$LL.recording.notification.recordingStarted()}</p>
                <p class="recording-subtitle">{$LL.recording.actionbar.desc.inProgress()}</p>
            </div>
        </div>
    </div>

    <svelte:fragment slot="buttons">
        <button
            class="btn btn-secondary btn-sm w-full"
            on:click={() => {
                recordingStore.hideInfoPopup();
            }}
        >
            {$LL.recording.ok()}
        </button>
    </svelte:fragment>
</PopUpContainer>

<style lang="scss">
    .recording-modal {
        min-width: 320px;
        max-width: 400px;
        border: 1px solid rgba(239, 68, 68, 0.3);
        box-shadow: 0 4px 20px rgba(239, 68, 68, 0.2);
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
        background: rgba(239, 68, 68, 0.1);
        overflow: hidden;
    }

    .progress-bar {
        height: 100%;
        background: linear-gradient(90deg, #ef4444 0%, #dc2626 100%);
        transition: width 0.05s linear;
        box-shadow: 0 0 10px rgba(239, 68, 68, 0.5);
    }

    .recording-icon-wrapper {
        position: relative;
        flex-shrink: 0;
    }

    .recording-icon-container {
        position: relative;
        z-index: 2;
        background: rgba(239, 68, 68, 0.15);
        border-radius: 12px;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid rgba(239, 68, 68, 0.3);
    }

    .recording-pulse {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 60px;
        height: 60px;
        border-radius: 50%;
        background: rgba(239, 68, 68, 0.3);
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        z-index: 1;
    }

    @keyframes pulse {
        0%,
        100% {
            opacity: 1;
            transform: translate(-50%, -50%) scale(1);
        }
        50% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scale(1.2);
        }
    }

    .recording-title {
        font-weight: 600;
        font-size: 15px;
        color: white;
        line-height: 1.4;
        margin: 0;
    }

    .recording-subtitle {
        font-size: 13px;
        color: rgba(255, 255, 255, 0.7);
        line-height: 1.3;
        margin: 0;
    }

    @media (max-width: 768px) {
        .recording-modal {
            min-width: 280px;
            max-width: 90vw;
        }

        .recording-title {
            font-size: 14px;
        }

        .recording-subtitle {
            font-size: 12px;
        }
    }
</style>
