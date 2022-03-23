import { detect } from './deviceDetection';
const browser = detect();

/**
 * The DeviceUtils class is able to return information about the device used such as:
 * the type of device, the screen, the OS, the web browser or even if it supports a specific JavaScript feature
 * /!\ WARNING: Note that the above solution is not always reliable. The value of the userAgent can be easily changed.
*/
export class DeviceUtils {
    private static message: string = "Your browser is compatible";

    /**
     * Add cases of incompatibilities here
     */
    public static isCompatible(): boolean {
        // Not compatible with "iOS < 15" because it doesn't support "BigInt64Array"
        if (browser?.os === "iOS" && browser?.version < 15) {
            this.message = `Your browser is not compatible. Please update your ${browser.os} version (you have ${browser.version})`
            return false;
        }

        // Not compatible with "edge < 79" because it doesn't support "BigInt64Array"
        if (browser?.browser === "edge" && browser?.version < 79) {
            this.message = `Your browser is not compatible. Please update your ${browser.browser} version (you have ${browser.version})`
            return false;
        }

        // Not compatible with "firefox < 68" because it doesn't support "BigInt64Array"
        if (browser?.browser === "firefox" && browser?.version < 68) {
            this.message = `Your browser is not compatible. Please update your ${browser.browser} version (you have ${browser.version})`
            return false;
        }

        // Not compatible with "chrome < 67" because it doesn't support "BigInt64Array"
        if (browser?.browser === "chrome" && browser?.version < 67) {
            this.message = `Your browser is not compatible. Please update your ${browser.browser} version (you have ${browser.version})`
            return false;
        }

        // Not compatible with "android < 99" because it doesn't support "BigInt64Array"
        if (browser?.browser === "android" && browser?.version < 99) {
            this.message = `Your browser is not compatible. Please update your ${browser.browser} version (you have ${browser.version})`
            return false;
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