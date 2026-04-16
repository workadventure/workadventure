import { readable } from "svelte/store";

export type BrowserMediaPermissionState = "granted" | "denied" | "prompt" | null;

function createBrowserPermissionStateStore(name: "camera" | "microphone") {
    return readable<BrowserMediaPermissionState>(null, (set) => {
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
                } as PermissionDescriptor);

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
