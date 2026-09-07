export function isIOS(): boolean {
    return (
        ["iPad Simulator", "iPhone Simulator", "iPod Simulator", "iPad", "iPhone", "iPod"].includes(
            navigator.platform,
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

export function isFirefox(): boolean {
    return window.navigator.userAgent.toLowerCase().indexOf("firefox") !== -1;
}

/**
 * Detects Safari without going through `getNavigatorType`, which throws on any user agent that is
 * none of Firefox / Chrome / Safari (embedded browsers, webviews). This one must never throw: it is
 * called at module evaluation time (see `speakerSelectionSupported` in MediaStore), where an
 * exception would take the whole media pipeline down with it.
 *
 * Every Chromium browser also carries "Safari" in its user agent, hence the exclusions. On iOS,
 * Chrome and Firefox are WebKit under the hood and share Safari's limitations, but they are covered
 * by `isIOS()` rather than here.
 */
export function isSafari(): boolean {
    const userAgent = window.navigator.userAgent;
    return /Safari/i.test(userAgent) && !/Chrome|Chromium|Android|CriOS|FxiOS|EdgiOS|OPiOS/i.test(userAgent);
}

export function isMac(): boolean {
    const nav = navigator as Navigator & { userAgentData?: { platform: string } };
    if (nav.userAgentData?.platform) {
        return nav.userAgentData.platform === "macOS";
    }
    return /Mac/i.test(navigator.userAgent);
}
