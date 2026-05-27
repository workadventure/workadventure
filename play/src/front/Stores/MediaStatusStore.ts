import { derived, readable } from "svelte/store";

export type BrowserMediaPermissionState = "granted" | "denied" | "prompt" | null;

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

export const mediaPermissionDeniedStore = derived(
    [cameraPermissionStateStore, microphonePermissionStateStore],
    ([$cameraPermissionStateStore, $microphonePermissionStateStore]): MediaPermissionDeniedState => {
        return {
            camera: $cameraPermissionStateStore === "denied",
            microphone: $microphonePermissionStateStore === "denied",
        };
    },
    {
        camera: false,
        microphone: false,
    },
);
