import VirtualJoystick from "phaser3-rex-plugins/plugins/virtualjoystick.js";
import { waScaleManager } from "../Services/WaScaleManager";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";

//the assets were found here: https://hannemann.itch.io/virtual-joystick-pack-free
export const joystickBaseKey = "joystickBase";
export const joystickBaseImg = "resources/objects/joystickSplitted.png";
export const joystickThumbKey = "joystickThumb";
export const joystickThumbImg = "resources/objects/smallHandleFilledGrey.png";

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
            base: scene.add
                .image(0, 0, joystickBaseKey)
                .setDisplaySize(
                    (baseSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
                    (baseSize / waScaleManager.zoomModifier) * window.devicePixelRatio
                )
                .setDepth(DEPTH_INGAME_TEXT_INDEX),
            thumb: scene.add
                .image(0, 0, joystickThumbKey)
                .setDisplaySize(
                    (thumbSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
                    (thumbSize / waScaleManager.zoomModifier) * window.devicePixelRatio
                )
                .setDepth(DEPTH_INGAME_TEXT_INDEX),
            enable: true,
            dir: "8dir",
        });
        this.visible = false;
        this.enable = false;

        this.resizeCallback = this.resize.bind(this);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }

    public showAt(x: number, y: number): void {
        this.x = x;
        this.y = y;
        this.visible = true;
        this.enable = true;
    }

    public hide(): void {
        this.visible = false;
        this.enable = false;
    }

    public resize() {
        this.base.setDisplaySize(this.getDisplaySizeByElement(baseSize), this.getDisplaySizeByElement(baseSize));
        this.thumb.setDisplaySize(this.getDisplaySizeByElement(thumbSize), this.getDisplaySizeByElement(thumbSize));
        this.setRadius(
            (radius / (waScaleManager.zoomModifier * waScaleManager.uiScalingFactor)) * window.devicePixelRatio
        );
    }

    private getDisplaySizeByElement(element: integer): integer {
        return (element / (waScaleManager.zoomModifier * waScaleManager.uiScalingFactor)) * window.devicePixelRatio;
    }

    public destroy() {
        super.destroy();
        this.scene.scale.removeListener(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }
}
