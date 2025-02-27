import { gameManager } from "../Game/GameManager";
import { enableCameraSceneVisibilityStore } from "../../Stores/MediaStore";
import { analyticsClient } from "../../Administration/AnalyticsClient";
import { ResizableScene } from "./ResizableScene";

export const EnableCameraSceneName = "EnableCameraScene";

export class EnableCameraScene extends ResizableScene {
    constructor() {
        super({
            key: EnableCameraSceneName,
        });
    }

    preload() {}

    create() {
        this.input.keyboard?.on("keyup-ENTER", () => {
            this.login();
        });

        enableCameraSceneVisibilityStore.showEnableCameraScene();

        if (gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }

    public onResize(): void {}

    update(time: number, delta: number): void {}

    public login(): void {
        analyticsClient.validationVideo();

        enableCameraSceneVisibilityStore.hideEnableCameraScene();

        this.scene.sleep(EnableCameraSceneName);
        gameManager.goToStartingMap();
    }
}
