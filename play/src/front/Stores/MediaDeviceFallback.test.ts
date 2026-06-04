import { describe, expect, it } from "vitest";
import { resolveAudioInputDeviceFallback } from "./MediaDeviceFallback";

const audioInput = (deviceId: string): Pick<MediaDeviceInfo, "deviceId" | "kind"> => ({
    deviceId,
    kind: "audioinput",
});

const videoInput = (deviceId: string): Pick<MediaDeviceInfo, "deviceId" | "kind"> => ({
    deviceId,
    kind: "videoinput",
});

describe("resolveAudioInputDeviceFallback", () => {
    it("selects an available microphone when the current one disappears", () => {
        expect(resolveAudioInputDeviceFallback([audioInput("iphone"), audioInput("macbook")], "airpods")).toStrictEqual(
            {
                type: "select",
                deviceId: "iphone",
            }
        );
    });

    it("skips the disconnected microphone if it is still present in an unstable device list", () => {
        expect(resolveAudioInputDeviceFallback([audioInput("iphone"), audioInput("macbook")], "iphone")).toStrictEqual({
            type: "select",
            deviceId: "macbook",
        });
    });

    it("disables the microphone when no audio input remains", () => {
        expect(resolveAudioInputDeviceFallback([videoInput("camera")], "iphone")).toStrictEqual({
            type: "disable",
        });
    });
});
