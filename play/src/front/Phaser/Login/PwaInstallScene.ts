import { pwaInstallSceneVisibleStore } from "../../Stores/PwaInstallStore";
import { gameManager } from "../Game/GameManager";
import { ResizableScene } from "./ResizableScene";

export const PwaInstallSceneName = "PwaInstallScene";

export class PwaInstallScene extends ResizableScene {
    constructor() {
        super({
            key: PwaInstallSceneName,
        });
    }

    preload() {}

    create() {
        pwaInstallSceneVisibleStore.set(true);

        if (gameManager.currentStartedRoom?.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    update(_time: number, _delta: number): void {}

    public onResize(): void {}
}
