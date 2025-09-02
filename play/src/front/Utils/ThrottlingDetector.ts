import { Subject, BehaviorSubject } from "rxjs";
import { visibilityStore } from "../Stores/VisibilityStore";

export interface ThrottlingEvent {
    type: "throttling_detected" | "recovery_triggered";
    timestamp: number;
    delay?: number;
}

/**
 * Simple throttling detector using RxJS subjects.
 * Emits events when throttling is detected or when recovery occurs.
 */
export class ThrottlingDetector {
    // Public subjects - main API
    public readonly events$ = new Subject<ThrottlingEvent>();
    public readonly isThrottled$ = new BehaviorSubject<boolean>(false);
    public readonly recoveryTriggered$ = new Subject<void>();

    private wasThrottled = false;
    private lastCheckTime = performance.now();
    private throttlingThreshold = 5000; // 5 seconds = throttling
    private checkInterval: NodeJS.Timeout | null = null;
    private visibilityUnsubscribe: (() => void) | null = null;

    constructor(private _visibilityStore = visibilityStore) {
        this.startDetection();
        this.setupVisibilityListener();
    }

    private startDetection(): void {
        // Simple timer that checks for delays
        this.checkInterval = setInterval(() => {
            const currentTime = performance.now();
            const actualDelay = currentTime - this.lastCheckTime;

            // If a large delay is detected, consider it throttling
            if (actualDelay > this.throttlingThreshold && !this.wasThrottled) {
                this.wasThrottled = true;

                // Emit throttling events
                this.isThrottled$.next(true);
                this.events$.next({
                    type: "throttling_detected",
                    timestamp: Date.now(),
                    delay: actualDelay,
                });
            }

            this.lastCheckTime = currentTime;
        }, 1000);
    }

    private setupVisibilityListener(): void {
        // Listen for when the page becomes visible again
        this.visibilityUnsubscribe = this._visibilityStore.subscribe((isVisible) => {
            if (isVisible && this.wasThrottled) {
                this.wasThrottled = false;

                // Emit recovery events
                this.isThrottled$.next(false);
                this.events$.next({
                    type: "recovery_triggered",
                    timestamp: Date.now(),
                });
                this.recoveryTriggered$.next(); // Simple signal for basic cases
            }
        });
    }

    public destroy(): void {
        if (this.checkInterval !== null) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
        if (this.visibilityUnsubscribe) {
            this.visibilityUnsubscribe();
        }

        // Complete the subjects
        this.events$.complete();
        this.isThrottled$.complete();
        this.recoveryTriggered$.complete();
    }
}

export const throttlingDetector = new ThrottlingDetector();
