/**
 * Browser compatibility utilities
 */
export interface BrowserInfo {
    name: string;
    updateUrl: string;
}

/**
 * Check if structuredClone is supported in the current browser
 * @returns true if supported, false otherwise
 */
export function isStructuredCloneSupported(): boolean {
    try {
        // structuredClone was added in:
        // - Chrome 98, Edge 98 (February 2022)
        // - Firefox 94 (November 2021)
        // - Safari 15.4 (March 2022)
        if (typeof structuredClone !== "function") {
            return false;
        }

        // Test if it actually works
        const testObj = { test: "value", nested: { data: 123 } };
        const cloned = structuredClone(testObj);

        // Verify the clone is deep (not a reference)
        cloned.nested.data = 456;
        if (testObj.nested.data === 456) {
            return false; // It's a shallow copy, not structuredClone
        }

        return true;
    } catch (e) {
        console.error("Error checking if structuredClone is supported", e);
        return false;
    }
}

/**
 * Detect browser type and return update information
 */
export function getBrowserInfo(): BrowserInfo {
    const userAgent = navigator.userAgent.toLowerCase();

    // Chrome/Chromium (including Edge Chromium)
    if (userAgent.includes("edg/") || (userAgent.includes("chrome") && userAgent.includes("edg"))) {
        return {
            name: "Microsoft Edge",
            updateUrl: "https://www.microsoft.com/edge",
        };
    }

    if (userAgent.toLowerCase().includes("chrome") || userAgent.toLowerCase().includes("chromium")) {
        return {
            name: "Google Chrome",
            updateUrl: "https://support.google.com/chrome/answer/95414",
        };
    }

    // Firefox
    if (userAgent.toLowerCase().includes("firefox") || userAgent) {
        return {
            name: "Mozilla Firefox",
            updateUrl: "https://www.firefox.com/en-US/more/update-your-browser/",
        };
    }

    // Safari
    if (userAgent.toLowerCase().includes("safari") && !userAgent.toLowerCase().includes("chrome")) {
        return {
            name: "Safari",
            updateUrl: "https://support.apple.com/102665",
        };
    }

    // Opera
    if (userAgent.toLowerCase().includes("opera") || userAgent.toLowerCase().includes("opr/")) {
        return {
            name: "Opera",
            updateUrl: "https://help.opera.com/en/latest/",
        };
    }

    // Default/Unknown browser
    return {
        name: "your browser",
        updateUrl: "https://support.google.com/chrome/answer/95414",
    };
}

/**
 * Get a user-friendly browser name for display
 */
export function getBrowserDisplayName(): string {
    return getBrowserInfo().name;
}
