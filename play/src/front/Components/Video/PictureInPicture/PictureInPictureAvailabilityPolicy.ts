export function hasPictureInPictureContent(isInRemoteConversation: boolean, streamableCount: number): boolean {
    return isInRemoteConversation || streamableCount > 0;
}

export function isDocumentPictureInPictureSupported(value: unknown): boolean {
    if (!value || typeof value !== "object") {
        return false;
    }

    const maybeWindow = value as { documentPictureInPicture?: { requestWindow?: unknown } };
    return typeof maybeWindow.documentPictureInPicture?.requestWindow === "function";
}

/**
 * Whether the videos take the picture-in-picture layout. The browser moves them into its
 * Picture-in-Picture window, where they take that layout. The desktop app mirrors them into its
 * companion window instead and never moves them: its main window keeps its usual layout.
 */
export function usesPictureInPictureLayout(pictureInPictureActive: boolean, desktopCompanion: boolean): boolean {
    return pictureInPictureActive && !desktopCompanion;
}
