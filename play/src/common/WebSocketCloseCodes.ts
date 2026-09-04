/**
 * Application-level WebSocket close codes shared by the front and the pusher.
 * RFC 6455 reserves 4000-4999 for private use.
 */

/**
 * Sent by the pusher once it has destroyed the logical session (left the room and the spaces).
 * A transport resume is pointless after it; the front must open a fresh connection.
 */
export const WS_CLOSE_CODE_SESSION_DESTROYED = 4000;
