export interface UrlPreviewVisibility {
    /**
     * Proximity messages travel peer to peer and never reach the homeserver. Asking it to
     * preview one would hand it a URL it was never meant to see.
     */
    isProximity: boolean;
    /** Same reasoning for an encrypted room: a preview request undoes the encryption. */
    isEncrypted: boolean;
    /** User setting for rooms where the homeserver has already seen the message anyway. */
    previewsInCleartextRooms: boolean;
    /** User setting, per device, for the cases above. Off unless explicitly turned on. */
    previewsInPrivateMessages: boolean;
}

/**
 * Decides whether we may ask the homeserver to preview a link in a given message.
 *
 * Mirrors Element's split between `urlPreviewsEnabled` and `urlPreviewsEnabled_e2ee`, with
 * proximity folded into the private case: Element defaults previews on in cleartext rooms
 * because the server already has the message, which is not true of proximity chat.
 */
export function shouldFetchUrlPreview(visibility: UrlPreviewVisibility): boolean {
    if (visibility.isProximity || visibility.isEncrypted) {
        return visibility.previewsInPrivateMessages;
    }
    return visibility.previewsInCleartextRooms;
}
