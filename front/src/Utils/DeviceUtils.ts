import { detect, Browser } from './deviceDetection';
const browser = detect();

interface SupportedBrowser {
    name: Browser,
    version: number
}

/**
 * The DeviceUtils class is able to return information about the device used such as:
 * the type of device, the screen, the OS, the web browser or even if it supports a specific JavaScript feature
 * /!\ WARNING: Note that the above solution is not always reliable. The value of the userAgent can be easily changed.
*/
export class DeviceUtils {
    private static message: string = "Your browser is incompatible. Please upgrade or use Google Chrome.";
    private static supportedBrowsers: SupportedBrowser[] = [
        {
            name: "ie",
            version: 999, // Unsupported
        },
        {
            name: "chrome",
            version: 67,
        },
        {
            name: "safari",
            version: 15,
        },
        {
            name: "firefox",
            version: 68,
        },
        {
            name: "edge",
            version: 79,
        },
        {
            name: "opera",
            version: 54,
        },
    ];

    public static isCompatible(): boolean {
        if (!this.supportsFeatures()) {
            return false;
        }
        if (!this.supportsBrowser()) {
            return false;
        }

        return true;
    }

    /**
     * This method checks if the browser has a specific and mandatory Javascript feature.
     */
    private static supportsFeatures(): boolean {
        const iframe = document.createElement("iframe");
        if (!(iframe instanceof HTMLIFrameElement)) {
            this.message = "Your browser doesn't support iFrames. Please upgrade or use Google Chrome."
            return false;
        }

        if (!Object.prototype.hasOwnProperty.call(navigator, "getUserMedia") || !Object.prototype.hasOwnProperty.call(window, "RTCPeerConnection")) {
            this.message = "Your browser doesn't support WebRTC. Please upgrade or use Google Chrome."
            return false;
        }

        if (!Object.prototype.hasOwnProperty.call(window, "BigInt64Array")) {
            this.message = "Your browser doesn't support BigInt64Array. Please upgrade or use Google Chrome."
            return false;
        }

        return true;
    }

    /**
     * This method checks if the browser and browser version is compatible
     * by providing minimum version numbers.
     */
    private static supportsBrowser(): boolean {
        if (browser) {
            if (this.supportedBrowsers.some(b => b.name === browser?.browser && browser?.version < b.version)) {
                this.message = `Your browser is not compatible. Please update your ${browser.browser} version (you have ${browser.version})`
                return false;
            }
        }

        return true;
    }

    public static getMessage(): string {
        return this.message;
    }

    public static getDevice(): string {
        return browser ? browser.device : "Unknown"
    }

    public static getOS(): string {
        return browser ? browser.os : "Unknown"
    }

    public static getBrowser(): string {
        return browser ? browser.browser : "Unknown"
    }

    public static getVersion(): number {
        return browser ? browser.version : 0
    }
}
