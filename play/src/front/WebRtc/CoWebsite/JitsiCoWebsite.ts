import CancelablePromise from "cancelable-promise";
import { z } from "zod";
import { get } from "svelte/store";
import { randomDelay } from "@workadventure/shared-utils/src/RandomDelay/RandomDelay";
import { inExternalServiceStore } from "../../Stores/MyMediaStore";
import { coWebsiteManager } from "../CoWebsiteManager";
import { jitsiExternalApiFactory } from "../JitsiExternalApiFactory";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { jitsiParticipantsCountStore, userIsJitsiDominantSpeakerStore } from "../../Stores/GameStore";
import { gameManager } from "../../Phaser/Game/GameManager";
import { currentPlayerWokaStore } from "../../Stores/CurrentPlayerWokaStore";
import { screenWakeLock } from "../../Utils/ScreenWakeLock";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

const JitsiConfig = z
    .object({
        startWithAudioMuted: z.boolean().optional(),
        startWithVideoMuted: z.boolean().optional(),
        prejoinPageEnabled: z.boolean().optional(),
        disableDeepLinking: z.boolean().optional(),
        gravatar: z
            .object({
                baseUrl: z.string().optional(),
                disabled: z.boolean().optional(),
            })
            .optional(),
    })
    .passthrough();

type JitsiConfig = z.infer<typeof JitsiConfig>;

interface JitsiOptions {
    jwt?: string;
    roomName: string;
    width: string;
    height: string;
    parentNode: HTMLElement;
    configOverwrite: JitsiConfig;
    interfaceConfigOverwrite: typeof defaultInterfaceConfig;
    onload?: () => void;
}

interface JitsiApi {
    executeCommand: (command: string, ...args: Array<unknown>) => void;
    addListener: (type: string, callback: Function) => void; //eslint-disable-line @typescript-eslint/ban-types
    removeListener: (type: string, callback: Function) => void; //eslint-disable-line @typescript-eslint/ban-types
    getParticipantsInfo(): { displayName: string; participantId: string }[];
    dispose: () => void;
}

declare global {
    interface Window {
        JitsiMeetExternalAPI: new (domain: string, options: JitsiOptions) => JitsiApi;
    }
}

const getDefaultConfig = (): JitsiConfig => {
    return {
        startWithAudioMuted: !get(requestedMicrophoneState),
        startWithVideoMuted: !get(requestedCameraState),
        prejoinPageEnabled: false,
        disableDeepLinking: false,
        gravatar: {
            disabled: true,
        },
    };
};

const mergeConfig = (config?: object) => {
    const currentDefaultConfig = getDefaultConfig();
    if (!config) {
        return currentDefaultConfig;
    }

    const parsedConfig = JitsiConfig.parse(config);

    return {
        ...currentDefaultConfig,
        ...config,
        startWithAudioMuted: parsedConfig.startWithAudioMuted ? true : currentDefaultConfig.startWithAudioMuted,
        startWithVideoMuted: parsedConfig.startWithVideoMuted ? true : currentDefaultConfig.startWithVideoMuted,
        prejoinPageEnabled: parsedConfig.prejoinPageEnabled ? true : currentDefaultConfig.prejoinPageEnabled,
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
        "shareaudio",
        "noisesuppression",
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
        "select-background",
        "download",
        "help",
        "mute-everyone" /*'security'*/,
    ],
};

export class JitsiCoWebsite extends SimpleCoWebsite {
    private jitsiApi?: JitsiApi;
    private audioCallback = this.onAudioChange.bind(this);
    private videoCallback = this.onVideoChange.bind(this);
    private dominantSpeakerChangedCallback = this.onDominantSpeakerChanged.bind(this);
    private participantsCountChangeCallback = this.onParticipantsCountChange.bind(this);

    private screenWakeRelease: (() => Promise<void>) | undefined;

    constructor(
        url: URL,
        widthPercent: number | undefined,
        closable: boolean | undefined,
        private roomName: string,
        private playerName: string,
        private jwt: string | undefined,
        private jitsiConfig: object | undefined,
        private jitsiInterfaceConfig: object | undefined,
        private domain: string
    ) {
        super(url, false, undefined, widthPercent, closable);
    }

    private loadPromise: CancelablePromise | undefined;

    load(): CancelablePromise<HTMLIFrameElement> {
        let cancelled = false;
        return (this.loadPromise = new CancelablePromise((resolve, reject, cancel) => {
            this.state.set("loading");

            inExternalServiceStore.set(true);

            jitsiExternalApiFactory
                .loadJitsiScript(this.domain)
                .then(async () => {
                    await randomDelay();
                    const options: JitsiOptions = {
                        roomName: this.roomName,
                        jwt: this.jwt,
                        width: "100%",
                        height: "100%",
                        parentNode: coWebsiteManager.getCoWebsiteBuffer(),
                        configOverwrite: mergeConfig(this.jitsiConfig),
                        interfaceConfigOverwrite: { ...defaultInterfaceConfig, ...this.jitsiInterfaceConfig },
                    };

                    if (!options.jwt) {
                        delete options.jwt;
                    }

                    this.jitsiApi = undefined;

                    const timemoutPromise = new Promise<void>((resolve, reject) => {
                        setTimeout(() => {
                            resolve();
                        }, 2000);
                    }); //failsafe in case the iframe is deleted before loading or too long to load

                    const jistiMeetLoadedPromise = new Promise<void>((resolve, reject) => {
                        options.onload = () => {
                            resolve();
                        }; //we want for the iframe to be loaded before triggering animations.
                        this.jitsiApi = new window.JitsiMeetExternalAPI(this.domain, options);

                        this.jitsiApi.addListener("videoConferenceJoined", () => {
                            this.jitsiApi?.executeCommand("displayName", this.playerName);
                            this.jitsiApi?.executeCommand("avatarUrl", get(currentPlayerWokaStore));
                            this.jitsiApi?.executeCommand("setNoiseSuppressionEnabled", {
                                enabled: window.navigator.userAgent.toLowerCase().indexOf("firefox") === -1,
                            });

                            screenWakeLock
                                .requestWakeLock()
                                .then((release) => (this.screenWakeRelease = release))
                                .catch((error) => console.error(error));

                            this.updateParticipantsCountStore();
                        });

                        this.jitsiApi.addListener("audioMuteStatusChanged", this.audioCallback);
                        this.jitsiApi.addListener("videoMuteStatusChanged", this.videoCallback);
                        this.jitsiApi.addListener("dominantSpeakerChanged", this.dominantSpeakerChangedCallback);
                        this.jitsiApi.addListener("participantJoined", this.participantsCountChangeCallback);
                        this.jitsiApi.addListener("participantLeft", this.participantsCountChangeCallback);
                        this.jitsiApi.addListener("participantKickedOut", this.participantsCountChangeCallback);
                    });

                    Promise.race([timemoutPromise, jistiMeetLoadedPromise])
                        .then(async () => {
                            await randomDelay();
                            const iframe = coWebsiteManager
                                .getCoWebsiteBuffer()
                                .querySelector<HTMLIFrameElement>('[id*="jitsi" i]');

                            if (cancelled /*&& iframe*/) {
                                console.log("CLOSING BECAUSE CANCELLED AFTER LOAD");
                                //this.closeOrUnload(iframe);
                                this.destroy();
                                return;
                            }

                            if (iframe && this.jitsiApi) {
                                this.jitsiApi.addListener("videoConferenceLeft", () => {
                                    this.closeOrUnload();
                                });

                                this.jitsiApi.addListener("readyToClose", () => {
                                    this.closeOrUnload();
                                });

                                this.iframe = iframe;
                                this.iframe.classList.add("pixel");
                                this.state.set("ready");
                                return resolve(iframe);
                            } else {
                                console.error("No iframe or no jitsiApi. We may have a problem.");
                            }
                        })
                        .catch((e) => {
                            return reject(e);
                        });
                })
                .catch((e) => {
                    reject(e);
                });

            cancel(() => {
                console.log("CLOSING Canceling JitsiCoWebsite");
                cancelled = true;
                this.unload().catch((err) => {
                    console.error("Cannot unload Jitsi co-website while cancel loading", err);
                });
            });
        }));
    }

    private closeOrUnload() {
        if (this.screenWakeRelease) {
            this.screenWakeRelease()
                .then(() => {
                    this.screenWakeRelease = undefined;
                })
                .catch((error) => console.error(error));
        }
        if (this.isClosable()) {
            coWebsiteManager.closeCoWebsite(this);
        } else {
            coWebsiteManager.unloadCoWebsite(this).catch((err) => {
                console.error("Cannot unload co-website from the Jitsi factory", err);
            });
        }
    }

    unload(): Promise<void> {
        if (this.loadPromise) {
            console.log("CLOSING unload JitsiCoWebsite");
        } else {
            console.log("CLOSING NOOOOT unload JitsiCoWebsite");
        }
        try {
            this.loadPromise?.cancel();
            this.destroy();
            inExternalServiceStore.set(false);

            return super.unload();
        } catch (e) {
            console.error("Cannot unload Jitsi co-website", e);
            return Promise.reject(e);
        }
    }

    public stop() {
        if (!this.jitsiApi) {
            return;
        }

        this.jitsiApi.removeListener("audioMuteStatusChanged", this.audioCallback);
        this.jitsiApi.removeListener("videoMuteStatusChanged", this.videoCallback);
    }

    public destroy() {
        userIsJitsiDominantSpeakerStore.set(false);
        jitsiParticipantsCountStore.set(0);
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

    private onDominantSpeakerChanged(data: { id: string }): void {
        if (this.jitsiApi) {
            userIsJitsiDominantSpeakerStore.set(
                data.id === this.getCurrentParticipantId(this.jitsiApi.getParticipantsInfo())
            );
        }
    }

    private onParticipantsCountChange(): void {
        this.updateParticipantsCountStore();
    }

    private updateParticipantsCountStore(): void {
        jitsiParticipantsCountStore.set(this.jitsiApi?.getParticipantsInfo().length ?? 0);
    }

    private getCurrentParticipantId(
        participants: { displayName: string; participantId: string }[]
    ): string | undefined {
        const currentPlayerName = gameManager.getPlayerName();
        for (const participant of participants) {
            if (participant.displayName === currentPlayerName) {
                return participant.participantId;
            }
        }
        return;
    }
}
