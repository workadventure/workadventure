import VirtualJoystick from 'phaser3-rex-plugins/plugins/virtualjoystick.js';
import {waScaleManager} from "../Services/WaScaleManager";
import {DEPTH_INGAME_TEXT_INDEX} from "../Game/DepthIndexes";

//the assets were found here: https://hannemann.itch.io/virtual-joystick-pack-free
export const joystickBaseKey = 'joystickBase';
export const joystickBaseImg = 'resources/objects/joystickSplitted.png';
export const joystickThumbKey = 'joystickThumb';
export const joystickThumbImg = 'resources/objects/smallHandleFilledGrey.png';

const baseSize = 50;
const thumbSize = 25;
const radius = 17.5;

export class MobileJoystick extends VirtualJoystick {
    private resizeCallback: () => void;

    constructor(scene: Phaser.Scene) {
        super(scene, {
            x: -1000,
            y: -1000,
            radius: radius * window.devicePixelRatio,
            base: scene.add.image(0, 0, joystickBaseKey).setDisplaySize(baseSize * window.devicePixelRatio, baseSize * window.devicePixelRatio).setDepth(DEPTH_INGAME_TEXT_INDEX),
            thumb: scene.add.image(0, 0, joystickThumbKey).setDisplaySize(thumbSize * window.devicePixelRatio, thumbSize * window.devicePixelRatio).setDepth(DEPTH_INGAME_TEXT_INDEX),
            enable: true,
            dir: "8dir",
        });
        this.visible = false;
        this.enable = false;

        this.scene.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
            if (!pointer.wasTouch) {
                return;
            }

            // Let's only display the joystick if there is one finger on the screen
            if ((pointer.event as TouchEvent).touches.length === 1) {
                this.x = pointer.x;
                this.y = pointer.y;
                this.visible = true;
                this.enable = true;
            } else {
                this.visible = false;
                this.enable = false;
            }
        });
        this.scene.input.on('pointerup', () => {
            this.visible = false;
            this.enable = false;
        });
        this.resizeCallback = this.resize.bind(this);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }

    private resize() {
        this.base.setDisplaySize(baseSize / waScaleManager.zoomModifier * window.devicePixelRatio, baseSize / waScaleManager.zoomModifier * window.devicePixelRatio);
        this.thumb.setDisplaySize(thumbSize / waScaleManager.zoomModifier * window.devicePixelRatio, thumbSize / waScaleManager.zoomModifier * window.devicePixelRatio);
        this.setRadius(radius / waScaleManager.zoomModifier * window.devicePixelRatio);
    }

    public destroy() {
        super.destroy();
        this.scene.scale.removeListener(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }
}
