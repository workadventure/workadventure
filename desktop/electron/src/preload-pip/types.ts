export type PipSdp = {
    type: RTCSdpType;
    sdp?: string;
};

export type PipTile = {
    /** Stable per-streamable id. Used to dedupe and reconcile placeholders. */
    tileKey: string;
    /** Empty string when this is a placeholder tile (peer present but no video track published). */
    trackId: string;
    name: string;
    isSelf: boolean;
    hasAudio: boolean;
    hasVideo: boolean;
};

export type PipState = {
    tiles: PipTile[];
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    canScreenShare: boolean;
    recording?: boolean;
    canRecord?: boolean;
};

export type PipCommand =
    | { type: "toggle-mic" }
    | { type: "toggle-camera" }
    | { type: "toggle-screenshare" }
    | { type: "pick-source"; sourceId: string; sourceName: string }
    | { type: "focus-main" }
    | { type: "close" };

export type PipSource = {
    id: string;
    name: string;
    thumbnailURL: string;
    type: "screen" | "window";
};

export type WorkAdventurePipApi = {
    onOffer: (callback: (sdp: PipSdp) => void) => () => void;
    onIce: (callback: (candidate: RTCIceCandidateInit) => void) => () => void;
    onClose: (callback: () => void) => () => void;
    onState: (callback: (state: PipState) => void) => () => void;
    sendAnswer: (sdp: PipSdp) => void;
    sendIce: (candidate: RTCIceCandidateInit) => void;
    sendCommand: (command: PipCommand) => void;
    requestSources: () => Promise<PipSource[]>;
    requestClose: () => void;
    ready: () => void;
};

declare global {
    interface Window {
        WADPiP?: WorkAdventurePipApi;
    }
}

export {};
