import {Pinch} from "phaser3-rex-plugins/plugins/gestures.js";

export class PinchManager {
    private scene: Phaser.Scene;
    private pinch!: any; // eslint-disable-line
    
    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.pinch = new Pinch(scene);

        this.pinch.on('pinch', (pinch:any) => { // eslint-disable-line
            let newZoom = this.scene.cameras.main.zoom * pinch.scaleFactor;
            if (newZoom < 0.25) {
                newZoom = 0.25;
            } else if(newZoom > 2) {
                newZoom = 2;
            }
            this.scene.cameras.main.setZoom(newZoom);
        });
    }
    
}