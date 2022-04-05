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
    private static message: string = "Your browser is compatible";
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

    /**
     * Add cases of incompatibilities here
     */
    public static isCompatible(): boolean {
        if (browser) {
            if (this.supportedBrowsers.some(b => b.name === browser?.browser && b.version < browser?.version)) {
                this.message = `Your browser is not compatible. Please update your ${browser.os} version (you have ${browser.version})`
                return false;
            }
        }

        return true;
    }

    // TODO: feature detection (BigInt64Array)

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
