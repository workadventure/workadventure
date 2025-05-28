import { z } from "zod";
import { get } from "svelte/store";
import { JitsiRoomConfigData } from "@workadventure/map-editor";
import { requestedCameraState, requestedMicrophoneState } from "../../Stores/MediaStore";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

export const JitsiConfig = z
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

export interface JitsiOptions {
    jwt?: string;
    roomName: string;
    width: string;
    height: string;
    parentNode: HTMLElement;
    configOverwrite: JitsiConfig;
    interfaceConfigOverwrite: typeof defaultInterfaceConfig;
    onload?: () => void;
}

export interface JitsiApi {
    executeCommand: (command: string, ...args: Array<unknown>) => void;
    addListener: (type: string, callback: Function) => void; // eslint-disable-line @typescript-eslint/no-unsafe-function-type
    removeListener: (type: string, callback: Function) => void; //eslint-disable-line @typescript-eslint/no-unsafe-function-type
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

export const mergeConfig = (config?: object) => {
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

export const defaultInterfaceConfig = {
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
    constructor(
        url: URL,
        widthPercent: number | undefined,
        closable: boolean | undefined,
        // FIXME: unused private variables.
        public roomName: string,
        private playerName: string,
        private _jwt: string | undefined,
        public readonly jitsiConfig: JitsiRoomConfigData | undefined,
        public readonly jitsiInterfaceConfig: object | undefined,
        private domain: string,
        public readonly jitsiRoomAdminTag: string | null
    ) {
        super(url, false, undefined, widthPercent, closable);
    }

    getDomain(): string {
        return this.domain;
    }

    public get jwt(): string | undefined {
        return this._jwt;
    }
}
