import {Pinch} from "phaser3-rex-plugins/plugins/gestures.js";

export class PinchManager {
    private scene: Phaser.Scene;
    private pinch!: any;
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.pinch = new Pinch(scene);

        this.pinch.on('pinch', (pinch:any) => {
            this.scene.cameras.main.zoom *= pinch.scaleFactor;
        });
    }
    
}