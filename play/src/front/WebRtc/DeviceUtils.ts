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

/**
 * undefined on embedded or uncommon browsers whose user agent names none of the three.
 */
export function getNavigatorType(): NavigatorType | undefined {
    if (window.navigator.userAgent.includes("Firefox")) {
        return NavigatorType.firefox;
    } else if (window.navigator.userAgent.includes("Chrome")) {
        return NavigatorType.chrome;
    } else if (window.navigator.userAgent.includes("Safari")) {
        return NavigatorType.safari;
    }
    return undefined;
}
export function isAndroid(): boolean {
    return window.navigator.userAgent.includes("Android");
}

export function isFirefox(): boolean {
    return window.navigator.userAgent.toLowerCase().indexOf("firefox") !== -1;
}

export function isSafari(): boolean {
    return getNavigatorType() === NavigatorType.safari;
}

export function isMac(): boolean {
    const nav = navigator as Navigator & { userAgentData?: { platform: string } };
    if (nav.userAgentData?.platform) {
        return nav.userAgentData.platform === "macOS";
    }
    return /Mac/i.test(navigator.userAgent);
}
