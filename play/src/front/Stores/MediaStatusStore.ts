import { derived, readable, type Readable } from "svelte/store";
import {
    type MediaAccessIssue,
    cameraAccessIssueStore,
    cameraListStore,
    devicesNotLoaded,
    mediaStreamConstraintsStore,
    microphoneAccessIssueStore,
    microphoneListStore,
    rawLocalStreamStore,
    requestedCameraState,
    requestedMicrophoneState,
    usedCameraDeviceIdStore,
    usedMicrophoneDeviceIdStore,
} from "./MediaStore";
import {
    computeMediaTrackStatus,
    type BrowserMediaPermissionState,
    type LocalMediaStatus,
    type LocalMediaTrackStatus,
} from "./MediaStatus";

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

interface CreateLocalMediaTrackStatusStoreOptions<TDevices extends unknown[] | undefined> {
    requestedStore: Readable<boolean>;
    accessIssueStore: Readable<MediaAccessIssue | null>;
    permissionStateStore: Readable<BrowserMediaPermissionState>;
    devicesStore: Readable<TDevices>;
    usedDeviceIdStore: Readable<string | undefined>;
    trackKind: "audio" | "video";
}

function createLocalMediaTrackStatusStore<TDevices extends unknown[] | undefined>({
    requestedStore,
    accessIssueStore,
    permissionStateStore,
    devicesStore,
    usedDeviceIdStore,
    trackKind,
}: CreateLocalMediaTrackStatusStoreOptions<TDevices>) {
    return derived<
        [
            typeof requestedStore,
            typeof mediaStreamConstraintsStore,
            typeof rawLocalStreamStore,
            typeof accessIssueStore,
            typeof permissionStateStore,
            typeof devicesStore,
            typeof usedDeviceIdStore,
            typeof devicesNotLoaded
        ],
        LocalMediaTrackStatus
    >(
        [
            requestedStore,
            mediaStreamConstraintsStore,
            rawLocalStreamStore,
            accessIssueStore,
            permissionStateStore,
            devicesStore,
            usedDeviceIdStore,
            devicesNotLoaded,
        ],
        ([
            $requested,
            $constraints,
            $streamResult,
            $accessIssue,
            $browserPermission,
            $devices,
            $usedDeviceId,
            $devicesNotLoaded,
        ]) =>
            computeMediaTrackStatus({
                requested: $requested,
                effectivelyRequested:
                    trackKind === "video" ? $constraints.video !== false : $constraints.audio !== false,
                trackKind,
                accessIssue: $accessIssue,
                browserPermission: $browserPermission,
                devices: $devices,
                usedDeviceId: $usedDeviceId,
                devicesNotLoaded: $devicesNotLoaded,
                streamResult: $streamResult,
            })
    );
}

export const localCameraStatusStore = createLocalMediaTrackStatusStore({
    requestedStore: requestedCameraState,
    accessIssueStore: cameraAccessIssueStore,
    permissionStateStore: cameraPermissionStateStore,
    devicesStore: cameraListStore,
    usedDeviceIdStore: usedCameraDeviceIdStore,
    trackKind: "video",
});

export const localMicrophoneStatusStore = createLocalMediaTrackStatusStore({
    requestedStore: requestedMicrophoneState,
    accessIssueStore: microphoneAccessIssueStore,
    permissionStateStore: microphonePermissionStateStore,
    devicesStore: microphoneListStore,
    usedDeviceIdStore: usedMicrophoneDeviceIdStore,
    trackKind: "audio",
});

export const localMediaStatusStore = derived<
    [typeof localCameraStatusStore, typeof localMicrophoneStatusStore],
    LocalMediaStatus
>([localCameraStatusStore, localMicrophoneStatusStore], ([$camera, $microphone]) => ({
    camera: $camera,
    microphone: $microphone,
}));
