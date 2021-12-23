class TouchScreenManager {
    readonly supportTouchScreen: boolean;

    constructor() {
        this.supportTouchScreen = this.detectTouchscreen();
    }

    //found here: https://stackoverflow.com/questions/4817029/whats-the-best-way-to-detect-a-touch-screen-device-using-javascript#4819886
    detectTouchscreen(): boolean {
        return "ontouchstart" in window || navigator.maxTouchPoints > 0;
    }
}

export const touchScreenManager = new TouchScreenManager();
