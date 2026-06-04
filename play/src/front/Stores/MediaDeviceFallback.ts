export type AudioInputDeviceFallback =
    | {
          type: "select";
          deviceId: string;
      }
    | {
          type: "disable";
      };

export function resolveAudioInputDeviceFallback(
    devices: Pick<MediaDeviceInfo, "deviceId" | "kind">[],
    deviceIdToAvoid?: string
): AudioInputDeviceFallback {
    // Keep this decision pure: callers decide whether the fallback is temporary or persisted.
    const fallbackDevice = devices.find(
        (device) => device.kind === "audioinput" && device.deviceId !== "" && device.deviceId !== deviceIdToAvoid
    );

    if (fallbackDevice) {
        return {
            type: "select",
            deviceId: fallbackDevice.deviceId,
        };
    }

    return {
        type: "disable",
    };
}
