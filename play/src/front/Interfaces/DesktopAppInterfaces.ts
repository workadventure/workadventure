// copy of Electron.SourcesOptions to avoid Electron dependency in front
export interface SourcesOptions {
    types: string[];
    thumbnailSize?: { height: number; width: number };
}

export interface DesktopCapturerSource {
    id: string;
    name: string;
    thumbnailURL: string;
}

export interface DesktopWindowState {
    focused: boolean;
    visible: boolean;
    minimized: boolean;
}

export type DesktopPipSdp = {
    type: "offer" | "answer" | "pranswer" | "rollback";
    sdp?: string;
};

export type DesktopPipTile = {
    /** Stable per-streamable id. Used by the PiP renderer to dedupe and reconcile placeholders. */
    tileKey: string;
    /** Empty string when this is a placeholder tile (peer present but no video track published). */
    trackId: string;
    name: string;
    isSelf: boolean;
    hasAudio: boolean;
    hasVideo: boolean;
};

export type DesktopPipState = {
    tiles: DesktopPipTile[];
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    canScreenShare: boolean;
    /** Optional: recording state (true if a recording is currently active). */
    recording?: boolean;
    canRecord?: boolean;
};

export type DesktopPipCommand =
    | { type: "toggle-mic" }
    | { type: "toggle-camera" }
    | { type: "toggle-screenshare" }
    | { type: "pick-source"; sourceId: string; sourceName: string }
    | { type: "focus-main" }
    | { type: "close" };

export type WorkAdventureDesktopPipApi = {
    readonly supported: true;
    open: () => Promise<boolean>;
    close: () => Promise<void>;
    sendOffer: (sdp: DesktopPipSdp) => void;
    sendIce: (candidate: RTCIceCandidateInit) => void;
    sendState: (state: DesktopPipState) => void;
    onAnswer: (callback: (sdp: DesktopPipSdp) => void) => () => void;
    onIce: (callback: (candidate: RTCIceCandidateInit) => void) => () => void;
    onClosed: (callback: () => void) => () => void;
    onRequestClose: (callback: () => void) => () => void;
    onCommand: (callback: (command: DesktopPipCommand) => void) => () => void;
};

export type WorkAdventureDesktopApi = {
    desktop: boolean;
    isDevelopment: () => Promise<boolean>;
    getVersion: () => Promise<string>;
    notify: (txt: string) => void;
    onMuteToggle: (callback: () => void) => void;
    onCameraToggle: (callback: () => void) => void;
    getWindowState: () => Promise<DesktopWindowState>;
    onWindowStateChange: (callback: (state: DesktopWindowState) => void) => () => void;
    getDesktopCapturerSources: (options: SourcesOptions) => Promise<DesktopCapturerSource[]>;
    pip?: WorkAdventureDesktopPipApi;
};
