class ScreenWakeLock {
    private isSupported: boolean;

    constructor() {
        if ("wakeLock" in navigator) {
            this.isSupported = true;
        } else {
            this.isSupported = false;
            console.info("Wake lock is not supported by this browser.");
        }
    }

    async requestWakeLock() {
        if (!this.isSupported) {
            return;
        }

        const request = await navigator.wakeLock.request("screen");

        return async function () {
            await request.release();
        };
    }
}

export const screenWakeLock = new ScreenWakeLock();
