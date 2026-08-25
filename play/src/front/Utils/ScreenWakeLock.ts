class ScreenWakeLock {
    private isSupported: boolean;
    private wakeLockSentinel: WakeLockSentinel | undefined;
    private isLockRequested = false;

    constructor() {
        if ("wakeLock" in navigator) {
            this.isSupported = true;
        } else {
            this.isSupported = false;
            console.info("Wake lock is not supported by this browser.");
        }

        if (this.isSupported) {
            document.addEventListener("visibilitychange", this.onVisibilityChange);
        }
    }

    private onVisibilityChange = (): void => {
        if (this.isLockRequested && document.visibilityState === "visible" && !this.wakeLockSentinel) {
            navigator.wakeLock
                .request("screen")
                .then((sentinel) => (this.wakeLockSentinel = sentinel))
                .catch((error) => console.error(error));
        }
    };

    async requestWakeLock() {
        if (!this.isSupported) {
            return;
        }

        this.isLockRequested = true;

        this.wakeLockSentinel = await navigator.wakeLock.request("screen");

        return async () => {
            this.isLockRequested = false;
            await this.wakeLockSentinel?.release();
            this.wakeLockSentinel = undefined;
        };
    }
}

export const screenWakeLock = new ScreenWakeLock();
