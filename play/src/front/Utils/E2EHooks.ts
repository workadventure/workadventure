import { gameManager } from "../Phaser/Game/GameManager.ts";

let webRtcConnectionsCount = 0;
let livekitConnectionsCount = 0;
let livekitRoomCount = 0;

/**
 * [DEBUG] Forces a WebRTC peer failure to test the retry mechanism.
 * This function finds the first SimplePeer with active video peers and triggers a forced failure.
 * @returns Information about the triggered failure, or null if no peers found
 */
function testWebRtcRetry(): { spaceName: string; userId: string; triggered: boolean } | null {
    try {
        const spaceRegistry = gameManager.getCurrentGameScene().spaceRegistry;
        const spaces = spaceRegistry.getAll();

        for (const space of spaces) {
            const simplePeer = space.simplePeer;
            if (simplePeer) {
                const result = simplePeer.forceFirstPeerFailure();
                if (result) {
                    console.info(
                        `[DEBUG] Retry test triggered for space "${space.getName()}", userId: ${result.userId}`
                    );
                    return { spaceName: space.getName(), ...result };
                }
            }
        }

        console.warn("[DEBUG] No active video peers found in any space to test retry");
        return null;
    } catch (error) {
        console.error("[DEBUG] Error while triggering WebRTC retry test:", error);
        return null;
    }
}

/**
 * [DEBUG] Forces a server disconnected event to test the reconnection flow (connection issue toast, wait for pusher, reload scene).
 * Emits on the current RoomConnection's serverDisconnected subject so the same handlers as a real disconnect run.
 * @returns { triggered: true } if the event was emitted, or null if not in a game scene or no connection
 */
function triggerServerDisconnected(): { triggered: true } | null {
    try {
        const scene = gameManager.getCurrentGameScene();
        const connection = scene.connection;
        if (!connection) {
            console.warn("[DEBUG] No room connection available to trigger serverDisconnected");
            return null;
        }
        connection._serverDisconnected.next();
        console.info("[DEBUG] serverDisconnected event triggered for E2E test");
        return { triggered: true };
    } catch (error) {
        console.error("[DEBUG] Error while triggering serverDisconnected:", error);
        return null;
    }
}

/**
 * [DEBUG] Forces a LiveKit WebSocket close to test the reconnection mechanism.
 * This function finds the first space with an active LiveKit connection and closes the WebSocket.
 * @returns Information about the triggered close, or null if no LiveKit connection found
 */
function testLivekitRetry(): { spaceName: string; closed: boolean } | null {
    try {
        const spaceRegistry = gameManager.getCurrentGameScene().spaceRegistry;
        const spaces = spaceRegistry.getAll();

        for (const space of spaces) {
            const spacePeerManager = space.spacePeerManager;
            if (spacePeerManager) {
                const result = spacePeerManager.forceWebSocketClose();
                if (result) {
                    console.info(`[DEBUG] LiveKit WebSocket close triggered for space "${space.getName()}"`);
                    return { spaceName: space.getName(), closed: true };
                }
            }
        }

        console.warn("[DEBUG] No active LiveKit connections found in any space to test retry");
        return null;
    } catch (error) {
        console.error("[DEBUG] Error while triggering LiveKit retry test:", error);
        return null;
    }
}

export function incrementWebRtcConnectionsCount() {
    webRtcConnectionsCount++;
}

export function decrementWebRtcConnectionsCount() {
    webRtcConnectionsCount--;
}

export function incrementLivekitConnectionsCount() {
    livekitConnectionsCount++;
}

export function decrementLivekitConnectionsCount() {
    livekitConnectionsCount--;
}

export function incrementLivekitRoomCount() {
    livekitRoomCount++;
}

export function decrementLivekitRoomCount() {
    livekitRoomCount--;
}

/**
 * The e2eHooks object contains methods used for E2E tests.
 * We should refrain from growing this object too much but it can be useful in very specific circumstances (usually linked to Phaser testing)
 */
export const e2eHooks = {
    async waitForNextFrame(): Promise<void> {
        return new Promise((resolve) => {
            gameManager.getCurrentGameScene().events.once(Phaser.Scenes.Events.POST_UPDATE, () => {
                resolve();
            });
        });
    },
    getWebRtcConnectionsCount(): number {
        return webRtcConnectionsCount;
    },
    getLivekitConnectionsCount(): number {
        return livekitConnectionsCount;
    },
    getLivekitRoomsCount(): number {
        return livekitRoomCount;
    },
    /**
     * [DEBUG] Forces a WebRTC peer failure to test the retry mechanism.
     */
    testWebRtcRetry,
    /**
     * [DEBUG] Forces a LiveKit WebSocket close to test the reconnection mechanism.
     */
    testLivekitRetry,
    /**
     * [DEBUG] Forces a server disconnected event to test the reconnection flow.
     */
    triggerServerDisconnected,
};
