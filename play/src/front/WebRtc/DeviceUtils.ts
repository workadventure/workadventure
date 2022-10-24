export function isIOS(): boolean {
    return (
        ["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(
            navigator.platform
        ) ||
        // iPad on iOS 13 detection
        (navigator.userAgent.includes("Mac") && "ontouchend" in document)
    );
}

export enum NavigatorType {
    firefox = 1,
    chrome,
    safari,
}

export function getNavigatorType(): NavigatorType {
    if (window.navigator.userAgent.includes("Firefox")) {
        return NavigatorType.firefox;
    } else if (window.navigator.userAgent.includes("Chrome")) {
        return NavigatorType.chrome;
    } else if (window.navigator.userAgent.includes("Safari")) {
        return NavigatorType.safari;
    }
    throw new Error("Couldn't detect navigator type");
}
export function isAndroid(): boolean {
    return window.navigator.userAgent.includes("Android");
}
