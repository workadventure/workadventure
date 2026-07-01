export type ScreenSharingButtonState = "normal" | "active" | "disabled";

export function getScreenSharingButtonState({
    canBeRequested,
    requested,
    screenSharingActivated,
}: {
    canBeRequested: boolean;
    requested: boolean;
    screenSharingActivated: boolean;
}): ScreenSharingButtonState {
    if (!screenSharingActivated || !canBeRequested) {
        return "disabled";
    }

    return requested ? "active" : "normal";
}
