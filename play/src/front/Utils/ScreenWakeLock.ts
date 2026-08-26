/**
 * Logs a wake lock failure, except when the browser refused because the page is hidden.
 * This happens routinely (someone comes talk to us while the tab is in the background) and the
 * lock is acquired again on the next "visibilitychange", so it is not worth polluting the console.
 */
function logWakeLockError(error: unknown): void {
    if (error instanceof DOMException && error.name === "NotAllowedError") {
        return;
    }
    console.error(error);
}

class ScreenWakeLock {
    private isSupported: boolean;
    private wakeLockSentinel: WakeLockSentinel | undefined;
    /**
     * Number of features currently asking for the screen to stay awake.
     * The lock is only released when this counter drops back to 0.
     */
    private lockRequestCount = 0;
    /**
     * The acquisition currently in flight, if any, so that 2 concurrent requests do not end up
     * creating 2 sentinels (only one of which we would be able to release).
     */
    private acquisition: Promise<void> | undefined;

    constructor() {
        if ("wakeLock" in navigator) {
            this.isSupported = true;
        } else {
            this.isSupported = false;
            console.info("Wake lock is not supported by this browser.");
        }

        if (this.isSupported) {
            // The Screen Wake Lock API automatically releases the lock when the document becomes
            // hidden, so we need to acquire it again when the user comes back to the tab/app.
            // This class is a singleton living for the whole lifetime of the page, so the listener
            // is never removed.
            // eslint-disable-next-line listeners/no-missing-remove-event-listener
            document.addEventListener("visibilitychange", this.onVisibilityChange);
        }
    }

    private onVisibilityChange = (): void => {
        if (document.visibilityState !== "visible") {
            return;
        }
        this.acquire().catch((error) => logWakeLockError(error));
    };

    /**
     * Asks for the screen to stay awake. Returns a function releasing this particular request.
     * The screen only goes back to sleep when every caller released its own request.
     */
    async requestWakeLock(): Promise<(() => Promise<void>) | undefined> {
        if (!this.isSupported) {
            return;
        }

        this.lockRequestCount++;
        // A failure here (typically a "NotAllowedError" because the document is hidden) is not
        // fatal: the lock will be acquired on the next "visibilitychange" if it is still wanted.
        await this.acquire().catch((error) => logWakeLockError(error));

        let isReleased = false;
        return async () => {
            if (isReleased) {
                return;
            }
            isReleased = true;
            this.lockRequestCount--;
            if (this.lockRequestCount > 0) {
                // Someone else still wants the screen awake.
                return;
            }
            const sentinel = this.wakeLockSentinel;
            this.wakeLockSentinel = undefined;
            if (sentinel && !sentinel.released) {
                await sentinel.release();
            }
        };
    }

    private acquire(): Promise<void> {
        if (this.lockRequestCount === 0 || this.hasActiveLock()) {
            return Promise.resolve();
        }
        if (!this.acquisition) {
            this.acquisition = navigator.wakeLock
                .request("screen")
                .then(async (sentinel) => {
                    if (this.lockRequestCount === 0) {
                        // Everybody released their request while we were acquiring the lock.
                        await sentinel.release();
                        return;
                    }
                    this.wakeLockSentinel = sentinel;
                })
                .finally(() => (this.acquisition = undefined));
        }
        return this.acquisition;
    }

    private hasActiveLock(): boolean {
        // The browser keeps the sentinel object around after it auto-released the lock (when the
        // document got hidden for instance), so the mere presence of a sentinel proves nothing.
        return this.wakeLockSentinel !== undefined && !this.wakeLockSentinel.released;
    }
}

export const screenWakeLock = new ScreenWakeLock();
