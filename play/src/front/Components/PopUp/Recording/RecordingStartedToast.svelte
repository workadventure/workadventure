<script lang="ts">
    import { LL } from "../../../../i18n/i18n-svelte";
    import StartRecordingIcon from "../../Icons/StartRecordingIcon.svelte";
    import ToastContainer from "../../Toasts/ToastContainer.svelte";
</script>

<ToastContainer extraClasses="recording-modal" duration={5000} theme="error">
    <div class="recording-content" data-testid="recording-started-modal">
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
</ToastContainer>

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

    .recording-icon-wrapper {
        position: relative;
        flex-shrink: 0;
    }

    .recording-icon-container {
        position: relative;
        z-index: 2;
        border-radius: 12px;
        padding: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
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
