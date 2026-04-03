export type LocalMediaTrackStatus =
    | "disabled"
    | "loading"
    | "loaded"
    | "permission_needed"
    | "denied"
    | "no_device"
    | "error";
export type BrowserMediaPermissionState = "granted" | "denied" | "prompt" | null;

export interface MediaTrackStatusStream {
    getAudioTracks(): unknown[];
    getVideoTracks(): unknown[];
}

export type MediaTrackStatusStreamValue =
    | {
          type: "success";
          stream: MediaTrackStatusStream | undefined;
      }
    | {
          type: "error";
          error: unknown;
      };

export interface ComputeMediaTrackStatusInput {
    requested: boolean;
    effectivelyRequested: boolean;
    trackKind: "audio" | "video";
    accessIssue: "permission_denied" | "no_device" | null;
    browserPermission: BrowserMediaPermissionState;
    devices: unknown[] | undefined;
    usedDeviceId?: string;
    devicesNotLoaded: boolean;
    streamResult: MediaTrackStatusStreamValue;
}

export interface LocalMediaStatus {
    camera: LocalMediaTrackStatus;
    microphone: LocalMediaTrackStatus;
}

export function computeMediaTrackStatus({
    requested,
    effectivelyRequested,
    trackKind,
    accessIssue,
    browserPermission,
    devices,
    usedDeviceId,
    devicesNotLoaded,
    streamResult,
}: ComputeMediaTrackStatusInput): LocalMediaTrackStatus {
    if (browserPermission === "denied") {
        return "denied";
    }

    if (accessIssue === "permission_denied" && browserPermission !== "granted") {
        return "denied";
    }

    if (accessIssue === "no_device") {
        return "no_device";
    }

    if (!devicesNotLoaded && devices !== undefined && devices.length === 0) {
        return "no_device";
    }

    if (streamResult.type === "success" && streamResult.stream) {
        const tracks =
            trackKind === "video" ? streamResult.stream.getVideoTracks() : streamResult.stream.getAudioTracks();

        if (tracks.length > 0) {
            return "loaded";
        }
    }

    // Energy saving and similar modes can temporarily remove the live track while the
    // device is still configured and available for this session.
    if (requested && usedDeviceId !== undefined) {
        return "loaded";
    }

    if (browserPermission === "prompt" && !requested) {
        return "permission_needed";
    }

    if (!effectivelyRequested) {
        return "disabled";
    }

    if (!requested) {
        return "disabled";
    }

    if (streamResult.type === "error") {
        return "error";
    }

    return "loading";
}
