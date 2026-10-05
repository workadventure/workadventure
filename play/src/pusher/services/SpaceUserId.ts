import crypto from "crypto";

/**
 * The id a user is known by in every space of a room, and the identity it holds in LiveKit.
 *
 * It must survive a reconnection of the same browser tab, including one that lands on another pusher after a
 * play or back restart: that is what lets the back hand the user back its place in a space (and LiveKit keep the
 * same participant) instead of seeing someone leave and a stranger arrive.
 *
 * The tab id and the user uuid are client-supplied, and the result is broadcast to every member of the space.
 * Hashing them with the server secret means knowing someone's spaceUserId does not let you claim it: you would
 * need their tab id, which never leaves the pusher.
 */
export function computeSpaceUserId(roomId: string, userUuid: string, tabId: string, secret: string): string {
    // Hex, not base64url: no "_" in the digest, so the room is still what precedes the last "_"
    const digest = crypto.createHmac("sha256", secret).update(`${userUuid}\n${tabId}`).digest("hex");
    return `${roomId}_${digest.slice(0, 32)}`;
}
