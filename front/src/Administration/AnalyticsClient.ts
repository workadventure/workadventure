import { POSTHOG_API_KEY, POSTHOG_URL } from "../Enum/EnvironmentVariable";
type Posthog = typeof import("posthog-js").default;

interface Window {
    posthog: Posthog;
}
declare let window: Window;

class AnalyticsClient {
    private posthogPromise: Promise<Posthog> | undefined;

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
            })
            .catch((e) => console.error(e));
    }

    loggedWithSso() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-logged-sso");
            })
            .catch((e) => console.error(e));
    }

    loggedWithToken() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-logged-token");
            })
            .catch((e) => console.error(e));
    }

    enteredRoom(roomId: string, roomGroup: string | null) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("$pageView", { roomId, roomGroup });
                posthog.capture("enteredRoom");
            })
            .catch((e) => console.error(e));
    }

    openedMenu() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-opened-menu");
            })
            .catch((e) => console.error(e));
    }

    launchEmote(emote: string) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-emote-launch", { emote });
            })
            .catch((e) => console.error(e));
    }

    enteredJitsi(roomName: string, roomId: string) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-entered-jitsi", { roomName, roomId });
            })
            .catch((e) => console.error(e));
    }

    validationName() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-name-validation");
            })
            .catch((e) => console.error(e));
    }

    validationWoka(scene: string) {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-woka-validation", { scene });
            })
            .catch((e) => console.error(e));
    }

    validationVideo() {
        this.posthogPromise
            ?.then((posthog) => {
                posthog.capture("wa-video-validation");
            })
            .catch((e) => console.error(e));
    }
}
export const analyticsClient = new AnalyticsClient();
