import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare let window: any;

class AnalyticsClient {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    private posthogPromise: Promise<any>;

    constructor() {
        if (POSTHOG_API_KEY && POSTHOG_URL) {
            this.posthogPromise = import("posthog-js").then(({ default: posthog }) => {
                posthog.init(POSTHOG_API_KEY, { api_host: POSTHOG_URL, disable_cookie: true });
                //the posthog toolbar need a reference in window to be able to work
                window.posthog = posthog;
                return posthog;
            });
        } else {
            this.posthogPromise = Promise.reject();
        }
    }

    identifyUser(uuid: string) {
        this.posthogPromise
            .then((posthog) => {
                posthog.identify(uuid, { uuid, wa: true });
            })
            .catch();
    }

    loggedWithSso() {
        this.posthogPromise
            .then((posthog) => {
                posthog.capture("wa-logged-sso");
            })
            .catch();
    }

    loggedWithToken() {
        this.posthogPromise
            .then((posthog) => {
                posthog.capture("wa-logged-token");
            })
            .catch();
    }

    enteredRoom(roomId: string) {
        this.posthogPromise
            .then((posthog) => {
                posthog.capture("$pageView", { roomId });
            })
            .catch();
    }

    openedMenu() {
        this.posthogPromise
            .then((posthog) => {
                posthog.capture("wa-opened-menu");
            })
            .catch();
    }

    launchEmote(emote: string) {
        this.posthogPromise
            .then((posthog) => {
                posthog.capture("wa-emote-launch", { emote });
            })
            .catch();
    }

    enteredJitsi(roomName: string, roomId: string) {
        this.posthogPromise
            .then((posthog) => {
                posthog.capture("wa-entered-jitsi", { roomName, roomId });
            })
            .catch();
    }
}
export const analyticsClient = new AnalyticsClient();
