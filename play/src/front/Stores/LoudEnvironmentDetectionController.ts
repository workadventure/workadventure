import type { Readable, Unsubscriber } from "svelte/store";
import type {
    BackgroundNoiseDetectorHandle,
    BackgroundNoiseDetectorOutboundMessage,
} from "@workadventure/noise-suppression/background-noise";

export interface LoudEnvironmentInput {
    track: MediaStreamTrack | undefined;
    microphoneRequested: boolean;
    silent: boolean;
    noiseSuppressionEnabled: boolean;
    requestedDeviceId: string | undefined;
}

export interface LoudEnvironmentDetectorDependencies {
    createDetector(context: AudioContext, stream: MediaStream): Promise<BackgroundNoiseDetectorHandle>;
    observeDetector(
        handle: BackgroundNoiseDetectorHandle,
        listener: (message: BackgroundNoiseDetectorOutboundMessage) => void,
    ): Unsubscriber;
    getAudioContext(): AudioContext;
    reportError(error: unknown): void;
}

// Detection time each microphone session gets: the warning is a hint at the start, not a permanent monitor.
export const LOUD_ENVIRONMENT_DETECTION_BUDGET_MS = 5 * 60 * 1000;

export class LoudEnvironmentDetectionController {
    private detector: BackgroundNoiseDetectorHandle | undefined;
    private stopObserving: Unsubscriber | undefined;
    private currentTrack: MediaStreamTrack | undefined;
    private currentRequestedDeviceId: string | undefined;
    private initializationFailed = false;
    // Never reset: once shown (then ignored or acted on), the warning does not come back at the next unmute.
    private warningShown = false;
    private budgetTimer: ReturnType<typeof setTimeout> | undefined;
    private budgetSpent = false;
    private starting = false;
    private generation = 0;
    private readonly unsubscribeInput: Unsubscriber;

    public constructor(
        input: Readable<LoudEnvironmentInput>,
        private readonly setWarning: (warning: boolean) => void,
        private readonly dependencies: LoudEnvironmentDetectorDependencies,
    ) {
        this.unsubscribeInput = input.subscribe((value) => this.update(value));
    }

    public destroy(): void {
        this.unsubscribeInput();
        this.endSession();
    }

    private update(input: LoudEnvironmentInput): void {
        const deviceChanged = input.requestedDeviceId !== this.currentRequestedDeviceId;
        const trackChanged = input.track !== this.currentTrack;

        if (deviceChanged || trackChanged) {
            this.endSession();
            this.currentTrack = input.track;
            this.currentRequestedDeviceId = input.requestedDeviceId;
            this.currentTrack?.addEventListener("ended", this.handleTrackEnded);
        }

        const track = this.currentTrack;
        const requestedDeviceIsCurrent =
            input.requestedDeviceId === undefined || track?.getSettings().deviceId === input.requestedDeviceId;
        const shouldDetect =
            input.microphoneRequested &&
            !input.silent &&
            !input.noiseSuppressionEnabled &&
            track?.readyState === "live" &&
            requestedDeviceIsCurrent;

        if (!shouldDetect || this.warningShown || this.initializationFailed || this.budgetSpent) {
            this.stopDetector();
            return;
        }

        if (this.detector === undefined && !this.starting) {
            this.budgetTimer ??= setTimeout(() => {
                this.budgetSpent = true;
                this.stopDetector();
            }, LOUD_ENVIRONMENT_DETECTION_BUDGET_MS);
            this.startDetector(track).catch((error: unknown) => {
                console.error("Unexpected loud environment detection error", error);
            });
        }
    }

    private readonly handleTrackEnded = (): void => {
        this.endSession();
    };

    private async startDetector(track: MediaStreamTrack): Promise<void> {
        const generation = ++this.generation;
        this.starting = true;

        try {
            const context = this.dependencies.getAudioContext();
            if (context.state === "suspended") {
                await context.resume();
            }

            const detector = await this.dependencies.createDetector(context, new MediaStream([track]));
            if (generation !== this.generation || track !== this.currentTrack) {
                detector.dispose();
                return;
            }

            this.starting = false;
            this.detector = detector;
            this.stopObserving = this.dependencies.observeDetector(detector, (message) => {
                if (message.type !== "background-noise-detected" || generation !== this.generation) {
                    return;
                }
                this.warningShown = true;
                this.setWarning(true);
                this.stopDetector();
            });

            await detector.ready;
            if (generation !== this.generation || track !== this.currentTrack) {
                if (this.detector === detector) {
                    this.stopDetector();
                }
            }
        } catch (error) {
            if (generation !== this.generation) {
                return;
            }
            this.stopDetector();
            this.initializationFailed = true;
            console.error("Failed to initialize loud environment detection", error);
            this.dependencies.reportError(error);
        }
    }

    private stopDetector(): void {
        this.generation++;
        this.starting = false;
        this.stopObserving?.();
        this.stopObserving = undefined;
        this.detector?.dispose();
        this.detector = undefined;
    }

    private endSession(): void {
        this.stopDetector();
        this.currentTrack?.removeEventListener("ended", this.handleTrackEnded);
        this.currentTrack = undefined;
        clearTimeout(this.budgetTimer);
        this.budgetTimer = undefined;
        this.budgetSpent = false;
        this.initializationFailed = false;
        this.setWarning(false);
    }
}
