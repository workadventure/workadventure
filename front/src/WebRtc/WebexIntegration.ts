import { coWebsiteManager } from "./CoWebsiteManager";
import WebexSignIn from "../Components/Webex/WebexSignIn.svelte";
import { WEBEX_AUTHORIZATION_URL, WEBEX_GLOBAL_SPACE_ID } from "../Enum/EnvironmentVariable";

interface Webex {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    widget: (el: HTMLElement) => any;
}
declare global {
    interface Window {
        webex: Webex;
    }
}

export type SpaceWidgetConfig = {
    accessToken: string;
    destinationId: string;
    destinationType: "spaceId";
    spaceActivities: {
        files: boolean;
        meet: boolean;
        message: boolean;
        people: boolean;
    };
};

const accessTokenKey = "@workadventure/webex_access_token";
const expiryDateKey = "@workadventure/webex_expiry_date";

export class WebexIntegration {
    private scriptLoader: Promise<Webex> | null = null;
    private authorizationPopup: Window | null = null;
    private storage: Storage = window.localStorage;
    private spaceWidget: { remove: () => void } | null = null;

    get accessToken() {
        return this.storage.getItem(accessTokenKey);
    }
    get expiryDate() {
        const isoDate = this.storage.getItem(expiryDateKey);

        return isoDate ? new Date(isoDate) : null;
    }

    get isAuthorized() {
        const now = new Date();
        return Boolean(this.accessToken && this.expiryDate && this.expiryDate > now);
    }

    public get hasGlobalChat() {
        return Boolean(WEBEX_GLOBAL_SPACE_ID);
    }
    public openAuthorizationPopup() {
        if (this.isAuthorized) return;

        this.storage.removeItem(accessTokenKey);
        this.storage.removeItem(expiryDateKey);

        const onClose = () => (this.authorizationPopup = null);

        this.authorizationPopup ??= window.open(
            WEBEX_AUTHORIZATION_URL,
            "webex",
            `scrollbars=no,resizable=no,status=no,location=no,toolbar=no,menubar=no,width=620,height=680`
        );
        this.authorizationPopup?.addEventListener("close", onClose.bind(this));
    }

    public handleWebexAuthorizationCallback() {
        const params = new Map(
            window.location.search
                .substring(1)
                .split("&")
                .map((params) => params.split("=") as [string, string])
        );

        if (params.has("accessToken")) {
            window.localStorage.setItem(accessTokenKey, params.get("accessToken")!);
        }
        if (params.has("expiresIn")) {
            const offset = 24 * 60 * 60 * 1000;
            window.localStorage.setItem(
                expiryDateKey,
                new Date(Date.now() + +params.get("expiresIn")! * 1000 - offset).toISOString()
            );
        }

        return params.has("accessToken");
    }

    private async waitForAuthorization() {
        const timeout = 5 * 60 * 1000; // 5 min
        const start = Date.now();

        while (this.isAuthorized === false && Date.now() - start < timeout) {
            await this.delay(1000);
        }

        const authorizationPopup = this.authorizationPopup;
        if (!authorizationPopup?.closed) {
            setTimeout(() => authorizationPopup?.close(), 3000);
        }
    }

    private delay(ms: number): Promise<void> {
        return new Promise((resolve) => setTimeout(resolve, ms));
    }

    public async startGlobal() {
        return WEBEX_GLOBAL_SPACE_ID
            ? this.start(WEBEX_GLOBAL_SPACE_ID, "message")
            : Promise.reject("WEBEX_GLOBAL_SPACE_ID not configured.");
    }

    public async start(
        spaceId: string,
        initialActivity: string = "meet",
        activities: Partial<SpaceWidgetConfig["spaceActivities"]> = {}
    ) {
        const self = this;

        await this.stop();

        coWebsiteManager.insertCoWebsite((cowebsiteDiv) => {
            new WebexSignIn({ target: cowebsiteDiv });

            return Promise.resolve();
        });

        const [webex] = await Promise.all([await self.loadWebexScripts(), await self.waitForAuthorization()]);

        coWebsiteManager.insertCoWebsite((cowebsiteDiv) => {
            self.spaceWidget = webex.widget(cowebsiteDiv).spaceWidget({
                accessToken: this.accessToken,
                destinationId: spaceId,
                destinationType: "spaceId",
                spaceActivities: {
                    files: true,
                    meet: true,
                    message: true,
                    people: true,
                    ...activities,
                },
                initialActivity,
                secondaryActivitiesFullWidth: false,
            });

            return Promise.resolve();
        });
    }

    public async stop() {
        if (this.spaceWidget) {
            this.spaceWidget?.remove();
            this.spaceWidget = null;
            await coWebsiteManager.closeCoWebsite();
        }
    }

    private async loadWebexScripts() {
        this.scriptLoader ??= new Promise<Webex>((resolve, reject) => {
            const webexStylesheet = document.createElement("link");
            webexStylesheet.rel = "stylesheet";
            webexStylesheet.href = "https://code.s4d.io/widget-space/production/main.css";
            const webexWidget = document.createElement("script");
            webexWidget.src = "https://code.s4d.io/widget-space/production/bundle.js";
            webexWidget.onload = () => {
                resolve(window.webex);
            };
            webexWidget.onerror = () => {
                reject();
            };

            document.head.appendChild(webexStylesheet);
            document.body.appendChild(webexWidget);
        });

        return await this.scriptLoader;
    }
}

export const webexIntegration = new WebexIntegration();
