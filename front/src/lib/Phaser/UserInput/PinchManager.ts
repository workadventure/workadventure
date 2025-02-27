import { Pinch } from "phaser3-rex-plugins/plugins/gestures.js";
import { waScaleManager } from "../Services/WaScaleManager";
import { GameScene } from "../Game/GameScene";

export class PinchManager {
    private scene: Phaser.Scene;
    private pinch!: any; // eslint-disable-line

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.pinch = new Pinch(scene);
        this.pinch.setDragThreshold(10);

        // The "pinch.scaleFactor" value is very sensitive and causes the screen to flicker.
        // We are smoothing its value with previous values to prevent the flicking.
        let smoothPinch = 1;

        this.pinch.on("pinchstart", () => {
            smoothPinch = 1;
        });

        // eslint-disable-next-line
        this.pinch.on("pinch", (pinch: any) => {
            if (pinch.scaleFactor > 1.2 || pinch.scaleFactor < 0.8) {
                // Pinch too fast! Probably a bad measure.
                return;
            }

            smoothPinch = (3 / 5) * smoothPinch + (2 / 5) * pinch.scaleFactor;
            if (this.scene instanceof GameScene) {
                this.scene.zoomByFactor(smoothPinch, false);
            } else {
                waScaleManager.zoomModifier *= smoothPinch;
            }
        });
    }

    destroy() {
        this.pinch.removeAllListeners();
    }
}
