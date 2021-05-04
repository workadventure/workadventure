import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';
import ScaleManager = Phaser.Scale.ScaleManager;
import {waScaleManager} from "../Services/WaScaleManager";

const outOfScreenX = -1000;
const outOfScreenY = -1000;


//the assets were found here: https://hannemann.itch.io/virtual-joystick-pack-free
export const joystickBaseKey = 'joystickBase';
export const joystickBaseImg = 'resources/objects/joystickSplitted.png';
export const joystickThumbKey = 'joystickThumb';
export const joystickThumbImg = 'resources/objects/smallHandleFilledGrey.png';

export class MobileJoystick extends VirtualJoystick {
    private resizeCallback: () => void;

    constructor(scene: Phaser.Scene) {
        super(scene, {
            x: outOfScreenX,
            y: outOfScreenY,
            radius: 20,
            base: scene.add.image(0, 0, joystickBaseKey).setDisplaySize(60, 60).setDepth(99999),
            thumb: scene.add.image(0, 0, joystickThumbKey).setDisplaySize(30, 30).setDepth(99999),
            enable: true,
            dir: "8dir",
        });

        this.scene.input.on('pointerdown', (pointer: { x: number; y: number; }) => {
            this.x = pointer.x;
            this.y = pointer.y;
        });
        this.scene.input.on('pointerup', () => {
            this.x = outOfScreenX;
            this.y = outOfScreenY;
        });
        this.resizeCallback = this.resize.bind(this);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }

    private resize() {
        this.base.setDisplaySize(60 / waScaleManager.zoomModifier, 60 / waScaleManager.zoomModifier);
        this.thumb.setDisplaySize(30 / waScaleManager.zoomModifier, 30 / waScaleManager.zoomModifier);
        this.setRadius(20 / waScaleManager.zoomModifier);
    }

    public destroy() {
        super.destroy();
        this.scene.scale.removeListener(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }
}
