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

export type PipChatMessage = {
    id: string;
    author: string;
    text: string;
    isSelf: boolean;
};

export type PipAnnotationState = {
    available: boolean;
    active: boolean;
    tool: string;
    color: string;
};

export type PipState = {
    tiles: PipTile[];
    micEnabled: boolean;
    cameraEnabled: boolean;
    screenSharing: boolean;
    canScreenShare: boolean;
    recording?: boolean;
    canRecord?: boolean;
    chatMessages?: PipChatMessage[];
    annotation?: PipAnnotationState;
};

export type PipCommand =
    | { type: "toggle-mic" }
    | { type: "toggle-camera" }
    | { type: "toggle-screenshare" }
    | { type: "pick-source"; sourceId: string; sourceName: string; displayId?: number }
    | { type: "focus-main" }
    | { type: "close" }
    | { type: "send-chat"; text: string }
    | { type: "send-reaction"; emote: string }
    | { type: "annotation-toggle" }
    | { type: "annotation-set-tool"; tool: string }
    | { type: "annotation-set-color"; color: string }
    | { type: "annotation-undo" }
    | { type: "annotation-clear" };

export type PipSource = {
    id: string;
    name: string;
    thumbnailURL: string;
    type: "screen" | "window";
    display_id?: number;
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
    /** Show a big number on each physical display and resolve the one the user clicks. */
    identifyScreens: () => Promise<PipSource | null>;
    requestClose: () => void;
    ready: () => void;
};

declare global {
    interface Window {
        WADPiP?: WorkAdventurePipApi;
    }
}

export {};
