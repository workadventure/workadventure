export type ScreenSharingCaptureMethod = "desktop" | "display-media" | "unsupported";

export function selectScreenSharingCaptureMethod({
    hasDesktopCapturer,
    hasDisplayMedia,
}: {
    hasDesktopCapturer: boolean;
    hasDisplayMedia: boolean;
}): ScreenSharingCaptureMethod {
    if (hasDesktopCapturer) {
        return "desktop";
    }

    if (hasDisplayMedia) {
        return "display-media";
    }

    return "unsupported";
}
