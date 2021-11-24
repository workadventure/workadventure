import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let window: any;

class AnalyticsClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private posthogPromise: Promise<any>|undefined;

    constructor() {
        if (POSTHOG_API_KEY && POSTHOG_URL) {
            this.posthogPromise = import("posthog-js").then(({ default: posthog }) => {
                posthog.init(POSTHOG_API_KEY, { api_host: POSTHOG_URL, disable_cookie: true });
                //the posthog toolbar need a reference in window to be able to work
                window.posthog = posthog;
                return posthog;
            });
        }
    }

    identifyUser(uuid: string, email: string | null) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.identify(uuid, { uuid, email, wa: true });
            });
    }

    loggedWithSso() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-logged-sso");
            });
    }

    loggedWithToken() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-logged-token");
            });
    }

    enteredRoom(roomId: string, roomGroup: string | null) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("$pageView", { roomId, roomGroup });
            });
    }

    openedMenu() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-opened-menu");
            });
    }

    launchEmote(emote: string) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-emote-launch", { emote });
            });
    }

    enteredJitsi(roomName: string, roomId: string) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-entered-jitsi", { roomName, roomId });
            });
    }
}
export const analyticsClient = new AnalyticsClient();
