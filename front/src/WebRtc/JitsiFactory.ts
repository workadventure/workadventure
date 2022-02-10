import { JITSI_URL } from "../Enum/EnvironmentVariable";
import { CoWebsite, coWebsiteManager } from "./CoWebsiteManager";
import { requestedCameraState, requestedMicrophoneState } from "../Stores/MediaStore";
import { get } from "svelte/store";

interface jitsiConfigInterface {
    startWithAudioMuted: boolean;
    startWithVideoMuted: boolean;
    prejoinPageEnabled: boolean;
    disableDeepLinking: boolean;
}

interface JitsiOptions {
    jwt?: string;
    roomName: string;
    width: string;
    height: string;
    parentNode: HTMLElement;
    configOverwrite: jitsiConfigInterface;
    interfaceConfigOverwrite: typeof defaultInterfaceConfig;
    onload?: Function;
}

interface JitsiApi {
    executeCommand: (command: string, ...args: Array<unknown>) => void;

    addListener: (type: string, callback: Function) => void;
    removeListener: (type: string, callback: Function) => void;

    dispose: () => void;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI: new (domain: string, options: JitsiOptions) => JitsiApi;
    }
}

const getDefaultConfig = (): jitsiConfigInterface => {
    return {
        startWithAudioMuted: !get(requestedMicrophoneState),
        startWithVideoMuted: !get(requestedCameraState),
        prejoinPageEnabled: false,
        disableDeepLinking: false,
    };
};

const mergeConfig = (config?: object) => {
    const currentDefaultConfig = getDefaultConfig();
    if (!config) {
        return currentDefaultConfig;
    }
    return {
        ...currentDefaultConfig,
        ...config,
        startWithAudioMuted: (config as jitsiConfigInterface).startWithAudioMuted
            ? true
            : currentDefaultConfig.startWithAudioMuted,
        startWithVideoMuted: (config as jitsiConfigInterface).startWithVideoMuted
            ? true
            : currentDefaultConfig.startWithVideoMuted,
        prejoinPageEnabled: (config as jitsiConfigInterface).prejoinPageEnabled
            ? true
            : currentDefaultConfig.prejoinPageEnabled,
    };
};

const defaultInterfaceConfig = {
    SHOW_CHROME_EXTENSION_BANNER: false,
    MOBILE_APP_PROMO: false,

    HIDE_INVITE_MORE_HEADER: true,
    DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
    DISABLE_VIDEO_BACKGROUND: true,

    // Note: hiding brand does not seem to work, we probably need to put this on the server side.
    SHOW_BRAND_WATERMARK: false,
    SHOW_JITSI_WATERMARK: false,
    SHOW_POWERED_BY: false,
    SHOW_PROMOTIONAL_CLOSE_PAGE: false,
    SHOW_WATERMARK_FOR_GUESTS: false,

    TOOLBAR_BUTTONS: [
        "microphone",
        "camera",
        "closedcaptions",
        "desktop",
        /*'embedmeeting',*/ "fullscreen",
        "fodeviceselection",
        "hangup",
        "profile",
        "chat",
        "recording",
        "livestreaming",
        "etherpad",
        "sharedvideo",
        "settings",
        "raisehand",
        "videoquality",
        "filmstrip",
        /*'invite',*/ "feedback",
        "stats",
        "shortcuts",
        "tileview",
        "videobackgroundblur",
        "download",
        "help",
        "mute-everyone" /*'security'*/,
    ],
};

const slugify = (...args: (string | number)[]): string => {
    const value = args.join(" ");

    return value
        .normalize("NFD") // split an accented letter in the base letter and the accent
        .replace(/[\u0300-\u036f]/g, "") // remove all previously split accents
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, "") // remove all chars not letters, numbers and spaces (to be replaced)
        .replace(/\s+/g, "-"); // separator
};

class JitsiFactory {
    private jitsiApi?: JitsiApi;
    private audioCallback = this.onAudioChange.bind(this);
    private videoCallback = this.onVideoChange.bind(this);
    private jitsiScriptLoaded: boolean = false;

    /**
     * Slugifies the room name and prepends the room name with the instance
     */
    public getRoomName(roomName: string, instance: string): string {
        return slugify(instance.replace("/", "-") + "-" + roomName);
    }

    public async start(
        roomName: string,
        playerName: string,
        jwt?: string,
        config?: object,
        interfaceConfig?: object,
        jitsiUrl?: string
    ) {
        const coWebsite = coWebsiteManager.searchJitsi();

        if (coWebsite) {
            await coWebsiteManager.closeCoWebsite(coWebsite);
        }

        // Jitsi meet external API maintains some data in local storage
        // which is sent via the appData URL parameter when joining a
        // conference. Problem is that this data grows indefinitely. Thus
        // after some time the URLs get so huge that loading the iframe
        // becomes slow and eventually breaks completely. Thus lets just
        // clear jitsi local storage before starting a new conference.
        window.localStorage.removeItem("jitsiLocalStorage");

        const domain = jitsiUrl || JITSI_URL;
        if (domain === undefined) {
            throw new Error("Missing JITSI_URL environment variable or jitsiUrl parameter in the map.");
        }
        await this.loadJitsiScript(domain);

        const options: JitsiOptions = {
            roomName: roomName,
            jwt: jwt,
            width: "100%",
            height: "100%",
            parentNode: coWebsiteManager.getCoWebsiteBuffer(),
            configOverwrite: mergeConfig(config),
            interfaceConfigOverwrite: { ...defaultInterfaceConfig, ...interfaceConfig },
        };

        if (!options.jwt) {
            delete options.jwt;
        }

        const doResolve = (): void => {
            const iframe = coWebsiteManager.getCoWebsiteBuffer().querySelector<HTMLIFrameElement>('[id*="jitsi" i]');
            if (iframe && this.jitsiApi) {
                const coWebsite = coWebsiteManager.addCoWebsiteFromIframe(
                    iframe,
                    false,
                    undefined,
                    undefined,
                    0,
                    false,
                    true
                );

                this.jitsiApi.addListener("videoConferenceLeft", () => {
                    this.closeOrUnload(coWebsite);
                });

                this.jitsiApi.addListener("readyToClose", () => {
                    this.closeOrUnload(coWebsite);
                });
            }

            coWebsiteManager.resizeAllIframes();
        };

        this.jitsiApi = undefined;

        options.onload = () => doResolve(); //we want for the iframe to be loaded before triggering animations.
        setTimeout(() => doResolve(), 2000); //failsafe in case the iframe is deleted before loading or too long to load
        this.jitsiApi = new window.JitsiMeetExternalAPI(domain, options);
        this.jitsiApi.executeCommand("displayName", playerName);

        this.jitsiApi.addListener("audioMuteStatusChanged", this.audioCallback);
        this.jitsiApi.addListener("videoMuteStatusChanged", this.videoCallback);
    }

    private closeOrUnload = function (coWebsite: CoWebsite) {
        if (coWebsite.closable) {
            coWebsiteManager.closeCoWebsite(coWebsite).catch(() => {
                console.error("Error during closing a Jitsi Meet");
            });
        } else {
            coWebsiteManager.unloadCoWebsite(coWebsite).catch(() => {
                console.error("Error during unloading a Jitsi Meet");
            });
        }
    };

    public restart() {
        if (!this.jitsiApi) {
            return;
        }

        this.jitsiApi.addListener("audioMuteStatusChanged", this.audioCallback);
        this.jitsiApi.addListener("videoMuteStatusChanged", this.videoCallback);

        const coWebsite = coWebsiteManager.searchJitsi();
        console.log("jitsi api ", this.jitsiApi);
        console.log("iframe cowebsite", coWebsite?.iframe);

        if (!coWebsite) {
            this.destroy();
            return;
        }

        this.jitsiApi.addListener("videoConferenceLeft", () => {
            this.closeOrUnload(coWebsite);
        });

        this.jitsiApi.addListener("readyToClose", () => {
            this.closeOrUnload(coWebsite);
        });
    }

    public stop() {
        if (!this.jitsiApi) {
            return;
        }

        this.jitsiApi.removeListener("audioMuteStatusChanged", this.audioCallback);
        this.jitsiApi.removeListener("videoMuteStatusChanged", this.videoCallback);
    }

    public destroy() {
        if (!this.jitsiApi) {
            return;
        }

        this.stop();
        this.jitsiApi?.dispose();
    }

    private onAudioChange({ muted }: { muted: boolean }): void {
        if (muted) {
            requestedMicrophoneState.disableMicrophone();
        } else {
            requestedMicrophoneState.enableMicrophone();
        }
    }

    private onVideoChange({ muted }: { muted: boolean }): void {
        if (muted) {
            requestedCameraState.disableWebcam();
        } else {
            requestedCameraState.enableWebcam();
        }
    }

    private async loadJitsiScript(domain: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (this.jitsiScriptLoaded) {
                resolve();
                return;
            }

            this.jitsiScriptLoaded = true;

            // Load Jitsi if the environment variable is set.
            const jitsiScript = document.createElement("script");
            jitsiScript.src = "https://" + domain + "/external_api.js";
            jitsiScript.onload = () => {
                resolve();
            };
            jitsiScript.onerror = () => {
                reject();
            };

            document.head.appendChild(jitsiScript);
        });
    }
}

export const jitsiFactory = new JitsiFactory();
