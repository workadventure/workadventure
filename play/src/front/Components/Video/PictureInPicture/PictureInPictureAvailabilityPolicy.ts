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
