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

    private setimeout: NodeJS.Timeout | null = null;

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

        // Disable the joystick by default
        this.enable = false;

        // Show the joeytick at the bottom middle of the screen
        const { width, height } = this.scene.game.canvas;
        this.x = width / 2;
        this.y = height - 200;

        // Add opacity
        this.base.setAlpha(0.3);
        this.thumb.setAlpha(0.3);

        this.resizeCallback = this.resize.bind(this);
        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }

    public showAt(x: number, y: number): void {
        // Show the joystick at the given position
        this.x = x;
        this.y = y;

        // The joystick is used by the player
        this.enable = true;
        this.visible = true;
    }

    public hide(): void {
        // The joystick is not used by the player
        this.enable = false;

        // After 30 seconds, disable the joystick
        if (this.setimeout) clearTimeout(this.setimeout);
        this.setimeout = setTimeout(() => {
            this.visible = false;
        }, 30000);
    }

    public resize() {
        // scale the joystick to the current zoom level
        this.base.setDisplaySize(this.getDisplaySizeByElement(baseSize), this.getDisplaySizeByElement(baseSize));
        this.thumb.setDisplaySize(this.getDisplaySizeByElement(thumbSize), this.getDisplaySizeByElement(thumbSize));
        this.setRadius(
            (radius / (waScaleManager.zoomModifier * waScaleManager.uiScalingFactor)) * window.devicePixelRatio
        );

        // TODO: change it to apply the good ratio of the canvas
        // Show the joeytick at the bottom middle of the screen
        const { width, height } = this.scene.game.canvas;
        this.showAt(width / 2, height - 200);
        this.hide();
    }

    private getDisplaySizeByElement(element: integer): integer {
        return (element / (waScaleManager.zoomModifier * waScaleManager.uiScalingFactor)) * window.devicePixelRatio;
    }

    public destroy() {
        this.scene.scale.removeListener(Phaser.Scale.Events.RESIZE, this.resizeCallback);
        super.destroy();
    }
}
