import { derived, readable, writable } from "svelte/store";
import { getNavigatorType, NavigatorType } from "../WebRtc/DeviceUtils";

export type BrowserMediaPermissionState = "granted" | "denied" | "prompt" | null;

export type MediaAccessIssue = "permission_denied" | "no_device";

/**
 * Last camera access failure. Cleared whenever the camera is requested again.
 */
export const cameraAccessIssueStore = writable<MediaAccessIssue | null>(null);

/**
 * Last microphone access failure. Cleared whenever the microphone is requested again.
 */
export const microphoneAccessIssueStore = writable<MediaAccessIssue | null>(null);

function createBrowserPermissionStateStore(name: "camera" | "microphone") {
    return readable<BrowserMediaPermissionState>(null, (set) => {
        if (typeof navigator === "undefined") {
            return;
        }

        if (!navigator.permissions?.query) {
            return;
        }

        let permissionStatus: PermissionStatus | undefined;
        let active = true;

        const update = () => {
            if (!active || !permissionStatus) {
                return;
            }
            set(permissionStatus.state);
        };

        const init = async () => {
            try {
                permissionStatus = await navigator.permissions.query({
                    name,
                });

                if (!active) {
                    return;
                }

                update();
                permissionStatus.addEventListener("change", update);
            } catch {
                set(null);
            }
        };

        init().catch((error) => {
            console.warn(`[MediaStatusStore] Could not query ${name} permission state`, error);
            set(null);
        });

        return () => {
            active = false;
            permissionStatus?.removeEventListener("change", update);
        };
    });
}

export const cameraPermissionStateStore = createBrowserPermissionStateStore("camera");
export const microphonePermissionStateStore = createBrowserPermissionStateStore("microphone");

export interface MediaPermissionDeniedState {
    camera: boolean;
    microphone: boolean;
}

/**
 * Whether navigator.permissions.query() can be trusted to report a camera/microphone denial.
 *
 * Only Chromium ever answers "denied". Firefox rejects the query outright, and Safari answers "prompt" even once
 * the user has denied, so on those a non-"denied" answer rules nothing out.
 */
const permissionStateIsReliable = ((): boolean => {
    if (typeof navigator === "undefined" || !navigator.permissions?.query) {
        return false;
    }
    return getNavigatorType() === NavigatorType.chrome;
})();

/**
 * Whether the browser is currently blocking a device.
 *
 * "denied" and "granted" are conclusive. Any other answer means the browser is not reporting a denial, which only
 * rules one out where its answer is reliable: on Chromium a merely dismissed prompt also rejects getUserMedia with
 * NotAllowedError, and that is not a denial. Everywhere else that failure is the only denial signal there is.
 */
export function isPermissionDenied(
    permissionState: BrowserMediaPermissionState,
    accessIssue: MediaAccessIssue | null,
    stateIsReliable: boolean,
): boolean {
    if (permissionState === "denied") {
        return true;
    }

    if (permissionState === "granted") {
        return false;
    }

    return stateIsReliable ? false : accessIssue === "permission_denied";
}

export const mediaPermissionDeniedStore = derived(
    [cameraPermissionStateStore, microphonePermissionStateStore, cameraAccessIssueStore, microphoneAccessIssueStore],
    ([
        $cameraPermissionStateStore,
        $microphonePermissionStateStore,
        $cameraAccessIssueStore,
        $microphoneAccessIssueStore,
    ]): MediaPermissionDeniedState => {
        return {
            camera: isPermissionDenied($cameraPermissionStateStore, $cameraAccessIssueStore, permissionStateIsReliable),
            microphone: isPermissionDenied(
                $microphonePermissionStateStore,
                $microphoneAccessIssueStore,
                permissionStateIsReliable,
            ),
        };
    },
    {
        camera: false,
        microphone: false,
    },
);

/**
 * What the camera/microphone action-bar tooltip should explain when the device is off.
 *
 * A denial follows mediaPermissionDeniedStore, so the tooltip and the settings panel always agree. An access issue
 * is only cleared when the device is requested again, so a "no_device" failure is ignored once the browser lists a
 * device of that kind: one was plugged in since.
 */
export function deviceHelpContext(
    denied: boolean,
    accessIssue: MediaAccessIssue | null,
    devices: readonly unknown[] | undefined,
    devicesNotLoaded: boolean,
): "permission" | "no_device" | null {
    if (denied) {
        return "permission";
    }
    if (devicesNotLoaded || devices === undefined) {
        return accessIssue === "no_device" ? "no_device" : null;
    }
    return devices.length === 0 ? "no_device" : null;
}
