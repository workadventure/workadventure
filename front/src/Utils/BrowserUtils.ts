export type Browser = {
    name: string;
    version: number;
};

export type SupportedBrowser = {
    name: string;
    minVersion: number;
};

export class BrowserUtils {
    public static supportedBrowsers: SupportedBrowser[] = [
        {
            name: "firefox",
            minVersion: 80,
        },
        {
            name: "chrome",
            minVersion: 80,
        },
        {
            name: "opera",
            minVersion: 70,
        },
        {
            name: "safari",
            minVersion: 13,
        },
        {
            name: "edge",
            minVersion: 80,
        },
    ];

    public static getBrowser(): Browser {
        const userAgent = navigator.userAgent;
        const matches = userAgent.match(/(opera|chrome|safari|firefox(?=\/))\/?\s*(\d+)/i) || [];

        // Is Opera
        if (matches[1]?.toLowerCase() === "chrome") {
            const matchVersion = userAgent.match(/\bOPR\/(\d+)/);
            if (matchVersion !== null) {
                return {
                    name: "opera",
                    version: parseInt(matchVersion[1]),
                };
            }
        }

        if (userAgent.indexOf("Edge") > -1) {
            const matchVersion = userAgent.match(/Edge\/(\d+)/);
            if (matchVersion !== null) {
                return {
                    name: "edge",
                    version: parseInt(matchVersion[1]),
                };
            }
        }

        const browserName = matches[2] ? [matches[1], matches[2]] : [navigator.appName, navigator.appVersion, "-?"];

        const matchVersion = userAgent.match(/version\/(\d+)/i);
        if (matchVersion !== null) {
            browserName.splice(1, 1, matchVersion[1]);
        }

        return {
            name: browserName[0].toLowerCase(),
            version: +browserName[1],
        };
    }

    public static isSupported(browser: Browser): boolean {
        const currentBrowser = this.getBrowser();
        const foundBrowser = this.supportedBrowsers.find(
            (supportedBrowser) => supportedBrowser.name === currentBrowser.name
        );

        if (!foundBrowser) {
            console.warn(`Unknown browser: ${currentBrowser.name}\\${currentBrowser.version}`);
        }

        return !foundBrowser || foundBrowser.minVersion <= currentBrowser.version;
    }
}
