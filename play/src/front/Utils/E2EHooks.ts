import { gameManager } from "../Phaser/Game/GameManager";

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
};
