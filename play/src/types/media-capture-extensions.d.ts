declare global {
    interface MediaTrackSupportedConstraints {
        voiceIsolation?: boolean;
    }

    interface MediaTrackConstraintSet {
        voiceIsolation?: ConstrainBoolean;
    }

    interface MediaTrackSettings {
        voiceIsolation?: boolean;
    }

    interface MediaTrackCapabilities {
        voiceIsolation?: boolean[];
    }
}

export {};
