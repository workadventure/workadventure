import * as Phaser from "phaser";
import VirtualJoystick from "phaser4-rex-plugins/plugins/virtualjoystick.js";
import { waScaleManager } from "../Services/WaScaleManager";
import { DEPTH_INGAME_TEXT_INDEX } from "../Game/DepthIndexes";

import Image = Phaser.GameObjects.Image;

//the assets were found here: https://hannemann.itch.io/virtual-joystick-pack-free
export const joystickBaseKey = "joystickBase";
export const joystickBaseImg = "resources/objects/joystickSplitted.png";
export const joystickThumbKey = "joystickThumb";
export const joystickThumbImg = "resources/objects/smallHandleFilledGrey.png";

const baseSize = 50;
const thumbSize = 25;
const radius = 17.5;

export class MobileJoystick extends VirtualJoystick {
    private readonly joystickScene: Phaser.Scene;
    private readonly joystickBase: Image;
    private readonly joystickThumb: Image;
    private resizeCallback: () => void;

    private setimeout: NodeJS.Timeout | null = null;
    private destroyed: boolean = false;

    constructor(scene: Phaser.Scene) {
        const joystickBase = scene.add
            .image(0, 0, joystickBaseKey)
            .setDisplaySize(
                (baseSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
                (baseSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
            )
            .setDepth(DEPTH_INGAME_TEXT_INDEX);
        const joystickThumb = scene.add
            .image(0, 0, joystickThumbKey)
            .setDisplaySize(
                (thumbSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
                (thumbSize / waScaleManager.zoomModifier) * window.devicePixelRatio,
            )
            .setDepth(DEPTH_INGAME_TEXT_INDEX);

        super(scene, {
            x: -1000,
            y: -1000,
            radius: radius * window.devicePixelRatio,
            base: joystickBase,
            thumb: joystickThumb,
            enable: true,
            dir: "8dir",
        });
        this.joystickScene = scene;
        this.joystickBase = joystickBase;
        this.joystickThumb = joystickThumb;

        // Disable the joystick by default
        this.enable = false;

        // Show the joystick at the bottom middle of the screen
        const { width, height } = this.joystickScene.game.canvas;
        this.x = width / 2;
        this.y = height * 0.8;

        // Add opacity
        this.joystickBase.setAlpha(0.3);
        this.joystickThumb.setAlpha(0.3);

        this.resizeCallback = this.resize.bind(this);
        this.joystickScene.scale.on(Phaser.Scale.Events.RESIZE, this.resizeCallback);
    }

    public showAt(x: number, y: number): void {
        // Show the joystick at the given position
        this.x = x;
        this.y = y;

        // The joystick is used by the player
        this.enable = true;
        this.visible = true;
    }

    public hide(delay: number): void {
        // The joystick is not used by the player
        this.enable = false;

        // After 30 seconds, disable the joystick
        if (this.setimeout) clearTimeout(this.setimeout);
        this.setimeout = setTimeout(() => {
            if (this.destroyed) {
                return;
            }
            this.visible = false;
        }, delay);
    }

    public resize() {
        // scale the joystick to the current zoom level
        this.joystickBase.setDisplaySize(
            this.getDisplaySizeByElement(baseSize),
            this.getDisplaySizeByElement(baseSize),
        );
        this.joystickThumb.setDisplaySize(
            this.getDisplaySizeByElement(thumbSize),
            this.getDisplaySizeByElement(thumbSize),
        );
        this.setRadius(
            (radius / (waScaleManager.zoomModifier * waScaleManager.uiScalingFactor)) * window.devicePixelRatio,
        );

        // TODO: change it to apply the good ratio of the canvas
        // Show the joystick at the bottom middle of the screen
        const { width, height } = this.joystickScene.game.canvas;
        this.x = width / 2;
        this.y = height * 0.8;
    }

    private setRadius(radius: number): void {
        this.joystickBase.setDisplaySize(radius * 2, radius * 2);
        this.joystickThumb.setDisplaySize(radius, radius);
    }

    private getDisplaySizeByElement(element: integer): integer {
        return (element / (waScaleManager.zoomModifier * waScaleManager.uiScalingFactor)) * window.devicePixelRatio;
    }

    public destroy() {
        this.joystickScene.scale.removeListener(Phaser.Scale.Events.RESIZE, this.resizeCallback);
        super.destroy();
        this.destroyed = true;
    }
}
