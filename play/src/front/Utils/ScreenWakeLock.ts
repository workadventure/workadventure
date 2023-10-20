class ScreenWakeLock {
    private isSupported: boolean;
    private wakeLock: WakeLockSentinel | null;

    constructor() {
        this.wakeLock = null;

        if ("wakeLock" in navigator) {
            this.isSupported = true;
            console.log("Screen Wake Lock API supported!");
        } else {
            this.isSupported = false;
            console.info("Wake lock is not supported by this browser.");
        }
    }

    async requestWakeLock() {
        if (!this.isSupported || this.wakeLock !== null) {
            return;
        }

        this.wakeLock = await navigator.wakeLock.request("screen");
        console.log("Screen Wake Lock is active");
    }

    async releaseWakeLock() {
        if (!this.isSupported || this.wakeLock === null) {
            return;
        }

        await this.wakeLock.release().then(() => {
            this.wakeLock = null;
        });
        console.log("Screen Wake Lock is released");
    }
}

export const screenWakeLock = new ScreenWakeLock();
