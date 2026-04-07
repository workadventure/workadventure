import type { BrowserMediaPermissionState } from "./MediaStatusStore";
import type { LocalStreamStoreValue } from "./MediaStore";

export function getSynchronizedCameraState(
    requestedCameraState: boolean,
    cameraPermissionState: BrowserMediaPermissionState
): boolean {
    return requestedCameraState && cameraPermissionState === "granted";
}

export function getLocalStreamForPublishing(
    localStreamStoreValue: LocalStreamStoreValue,
    shouldMaskVideoForPublishing: boolean
): LocalStreamStoreValue {
    if (
        !shouldMaskVideoForPublishing ||
        localStreamStoreValue.type !== "success" ||
        !localStreamStoreValue.stream ||
        localStreamStoreValue.stream.getVideoTracks().length === 0
    ) {
        return localStreamStoreValue;
    }

    return {
        type: "success",
        stream: new MediaStream(localStreamStoreValue.stream.getAudioTracks()),
    };
}
