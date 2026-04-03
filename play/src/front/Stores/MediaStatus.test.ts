import { describe, expect, it } from "vitest";
import { computeMediaTrackStatus } from "./MediaStatus";

const createStream = (options: { audioTracks?: number; videoTracks?: number } = {}) => ({
    getAudioTracks: () => Array.from({ length: options.audioTracks ?? 0 }, () => ({})),
    getVideoTracks: () => Array.from({ length: options.videoTracks ?? 0 }, () => ({})),
});

describe("computeMediaTrackStatus", () => {
    it("returns denied when access was rejected", () => {
        const status = computeMediaTrackStatus({
            requested: true,
            effectivelyRequested: true,
            trackKind: "video",
            accessIssue: "permission_denied",
            browserPermission: null,
            devices: undefined,
            devicesNotLoaded: true,
            streamResult: {
                type: "success",
                stream: undefined,
            },
        });

        expect(status).toBe("denied");
    });

    it("returns no_device when there is no usable device", () => {
        const status = computeMediaTrackStatus({
            requested: true,
            effectivelyRequested: true,
            trackKind: "audio",
            accessIssue: null,
            browserPermission: null,
            devices: [],
            devicesNotLoaded: false,
            streamResult: {
                type: "success",
                stream: undefined,
            },
        });

        expect(status).toBe("no_device");
    });

    it("returns loaded when the requested track is present", () => {
        const status = computeMediaTrackStatus({
            requested: true,
            effectivelyRequested: true,
            trackKind: "video",
            accessIssue: null,
            browserPermission: null,
            devices: [{}],
            usedDeviceId: undefined,
            devicesNotLoaded: false,
            streamResult: {
                type: "success",
                stream: createStream({ videoTracks: 1 }),
            },
        });

        expect(status).toBe("loaded");
    });

    it("returns disabled when media capture is not requested", () => {
        const status = computeMediaTrackStatus({
            requested: false,
            effectivelyRequested: false,
            trackKind: "audio",
            accessIssue: null,
            browserPermission: null,
            devices: [{}],
            usedDeviceId: "mic-1",
            devicesNotLoaded: false,
            streamResult: {
                type: "success",
                stream: createStream(),
            },
        });

        expect(status).toBe("disabled");
    });

    it("returns error when capture fails for another reason", () => {
        const status = computeMediaTrackStatus({
            requested: true,
            effectivelyRequested: true,
            trackKind: "audio",
            accessIssue: null,
            browserPermission: null,
            devices: [{}],
            usedDeviceId: undefined,
            devicesNotLoaded: false,
            streamResult: {
                type: "error",
                error: new Error("boom"),
            },
        });

        expect(status).toBe("error");
    });

    it("returns loading while waiting for the requested track", () => {
        const status = computeMediaTrackStatus({
            requested: true,
            effectivelyRequested: true,
            trackKind: "video",
            accessIssue: null,
            browserPermission: null,
            devices: undefined,
            usedDeviceId: undefined,
            devicesNotLoaded: true,
            streamResult: {
                type: "success",
                stream: undefined,
            },
        });

        expect(status).toBe("loading");
    });

    it("returns denied when the browser already reports denied permission", () => {
        const status = computeMediaTrackStatus({
            requested: false,
            effectivelyRequested: false,
            trackKind: "video",
            accessIssue: null,
            browserPermission: "denied",
            devices: [{}],
            usedDeviceId: undefined,
            devicesNotLoaded: false,
            streamResult: {
                type: "success",
                stream: undefined,
            },
        });

        expect(status).toBe("denied");
    });

    it("returns permission_needed when permission has not been granted yet and media is not requested", () => {
        const status = computeMediaTrackStatus({
            requested: false,
            effectivelyRequested: false,
            trackKind: "audio",
            accessIssue: null,
            browserPermission: "prompt",
            devices: [{}],
            usedDeviceId: undefined,
            devicesNotLoaded: false,
            streamResult: {
                type: "success",
                stream: undefined,
            },
        });

        expect(status).toBe("permission_needed");
    });

    it("does not return denied when accessIssue is shared but this track permission is granted", () => {
        const status = computeMediaTrackStatus({
            requested: true,
            effectivelyRequested: true,
            trackKind: "audio",
            accessIssue: "permission_denied",
            browserPermission: "granted",
            devices: [{}],
            usedDeviceId: undefined,
            devicesNotLoaded: false,
            streamResult: {
                type: "success",
                stream: createStream({ audioTracks: 1 }),
            },
        });

        expect(status).toBe("loaded");
    });

    it("returns disabled instead of loading when capture is not effectively requested", () => {
        const status = computeMediaTrackStatus({
            requested: true,
            effectivelyRequested: false,
            trackKind: "video",
            accessIssue: null,
            browserPermission: "granted",
            devices: [{}],
            usedDeviceId: undefined,
            devicesNotLoaded: false,
            streamResult: {
                type: "success",
                stream: undefined,
            },
        });

        expect(status).toBe("disabled");
    });

    it("returns loaded when the device is already known even if the live track is temporarily paused", () => {
        const status = computeMediaTrackStatus({
            requested: true,
            effectivelyRequested: false,
            trackKind: "video",
            accessIssue: null,
            browserPermission: "granted",
            devices: [{}],
            usedDeviceId: "camera-1",
            devicesNotLoaded: false,
            streamResult: {
                type: "success",
                stream: undefined,
            },
        });

        expect(status).toBe("loaded");
    });
});
