import { gameManager } from "../Phaser/Game/GameManager";

let webRtcConnectionsCount = 0;
let livekitConnectionsCount = 0;
let livekitRoomCount = 0;

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
                //gameManager.getCurrentGameScene().renderer.once(Phaser.Core.Events.POST_RENDER, () => {
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
};
