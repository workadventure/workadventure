import {Pinch} from "phaser3-rex-plugins/plugins/gestures.js";
import {waScaleManager} from "../Services/WaScaleManager";

export class PinchManager {
    private scene: Phaser.Scene;
    private pinch!: any; // eslint-disable-line

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.pinch = new Pinch(scene);

        this.pinch.on('pinch', (pinch:any) => { // eslint-disable-line
            waScaleManager.zoomModifier *= pinch.scaleFactor;
        });
    }

    destroy() {
        this.pinch.removeAllListeners();
    }
}
