import { Scene } from "phaser";
import { gameManager } from "../Game/GameManager";

export const EmptySceneName = "EmptyScene";

export class EmptyScene extends Scene {
    constructor() {
        super({
            key: EmptySceneName,
        });
    }

    preload() {}

    create() {
        if (gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    update(time: number, delta: number): void {}
}
