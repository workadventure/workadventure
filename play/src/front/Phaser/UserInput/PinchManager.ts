import type * as Phaser from "phaser";
import { Pinch } from "phaser4-rex-plugins/plugins/gestures.js";
import { waScaleManager } from "../Services/WaScaleManager";
import { GameScene } from "../Game/GameScene";
import { mapDragThreshold } from "./MapDragGesture";

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
        // Moving both fingers together pans, once the point between them has moved like a one-finger drag would.
        let start = { x: 0, y: 0 };
        let panning = false;

        // eslint-disable-next-line
        this.pinch.on("pinchstart", (pinch: any) => {
            smoothPinch = 1;
            start = { x: pinch.centerX, y: pinch.centerY };
            panning = false;
        });

        // eslint-disable-next-line
        this.pinch.on("pinch", (pinch: any) => {
            if (pinch.scaleFactor > 1.2 || pinch.scaleFactor < 0.8) {
                // Pinch too fast! Probably a bad measure.
                return;
            }

            smoothPinch = (3 / 5) * smoothPinch + (2 / 5) * pinch.scaleFactor;
            if (this.scene instanceof GameScene) {
                const centre = { x: pinch.centerX, y: pinch.centerY };
                panning ||= Math.hypot(centre.x - start.x, centre.y - start.y) >= mapDragThreshold({ wasTouch: true });
                const pan = panning ? { x: -pinch.movementCenterX, y: -pinch.movementCenterY } : undefined;
                this.scene.userInputManager.userInputHandler.handlePinch?.(smoothPinch, centre, pan);
            } else {
                waScaleManager.zoomModifier *= smoothPinch;
            }
        });
    }

    destroy() {
        this.pinch.removeAllListeners();
    }
}
