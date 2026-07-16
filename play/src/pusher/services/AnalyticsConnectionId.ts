import type { SocketData } from "../models/Websocket/SocketData";

/**
 * The key both analytics trackers pair a socket's open intervals on.
 *
 * Shared deliberately rather than duplicated: AnalyticsPresenceTracker keys
 * connection sessions on it and AnalyticsTimedEventTracker keys timed events on
 * it, and the admin joins the two on `(world, room_id, user_uuid, tab_id)`. If the
 * two ever disagreed on what identifies a socket, the join would mis-attribute
 * silently — a conversation would land on the wrong session, or none.
 *
 * tabId is what keeps two tabs of the same user in the same room apart. When it is
 * missing the fallback collapses them onto one id, so their intervals interleave
 * on a single pairing and only one is reported — acceptable, but it is why tabId
 * is preferred rather than a stylistic choice.
 */
export function analyticsConnectionId(socketData: SocketData): string {
    return socketData.tabId || `${socketData.userUuid}:${socketData.roomId}`;
}
