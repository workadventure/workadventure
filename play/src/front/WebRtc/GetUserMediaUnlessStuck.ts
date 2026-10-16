import { TimeoutError } from "@workadventure/shared-utils/src/Abort/TimeoutError";
import { analyticsClient } from "../Administration/AnalyticsClient";
import { raceTimeout } from "../Utils/PromiseUtils";

// With access granted, getUserMedia answers at once. Still pending after that, it is not waiting for the user but for
// a camera the system holds back, which can last hours, and MediaStore runs its updates one at a time: turning the
// camera off would wait behind it.
export const GET_USER_MEDIA_TIMEOUT_MS = 15_000;

/**
 * getUserMedia, given up after GET_USER_MEDIA_TIMEOUT_MS unless the browser may be asking the user for access.
 */
export async function getUserMediaUnlessStuck(constraints: MediaStreamConstraints): Promise<MediaStream> {
    // Asked first: a request rejected while we wait for the answer would be reported as unhandled
    const granted = await isMediaAccessGranted(constraints);
    const request = navigator.mediaDevices.getUserMedia(constraints);
    if (!granted) {
        return request;
    }
    try {
        return await raceTimeout(request, GET_USER_MEDIA_TIMEOUT_MS);
    } catch (e) {
        if (e instanceof TimeoutError) {
            analyticsClient.trackAdminEvent("media.device_error", {
                kind: constraints.video ? (constraints.audio ? "camera_microphone" : "camera") : "microphone",
                reason: "get_user_media_timeout",
            });
            // Should it answer after all, release the devices
            request.then(
                (stream) => stream.getTracks().forEach((track) => track.stop()),
                () => undefined,
            );
        }
        throw e;
    }
}

async function isMediaAccessGranted(constraints: MediaStreamConstraints): Promise<boolean> {
    const names: PermissionName[] = [];
    if (constraints.video) {
        names.push("camera");
    }
    if (constraints.audio) {
        names.push("microphone");
    }
    try {
        const statuses = await Promise.all(names.map((name) => navigator.permissions.query({ name })));
        return statuses.every((status) => status.state === "granted");
    } catch {
        // The browser cannot tell: wait for as long as it takes
        return false;
    }
}
