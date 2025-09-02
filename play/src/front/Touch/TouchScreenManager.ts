class TouchScreenManager {
    readonly supportTouchScreen: boolean;
    readonly primaryTouchDevice: boolean;

    constructor() {
        this.supportTouchScreen = this.detectTouchscreen();
        this.primaryTouchDevice = this.detectPrimaryTouchDevice();
    }

    //found here: https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript#4819886
    detectTouchscreen(): boolean {
        return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    }

    /**
     * Detects if the device is primarily designed for touch usage (smartphone, tablet)
     * and not a computer with touch capability
     */
    detectPrimaryTouchDevice(): boolean {
        // First check if the device has touch capability
        const hasTouchCapability = "ontouchstart" in window || navigator.maxTouchPoints > 0;

        if (!hasTouchCapability) return false;

        // Detect if the primary pointer is touch
        return window.matchMedia("(pointer: coarse)").matches;
    }
}

export const touchScreenManager = new TouchScreenManager();
