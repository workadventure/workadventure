import { Easing } from '../../types';
import { HtmlUtils } from '../../WebRtc/HtmlUtils';
import type { Box } from '../../WebRtc/LayoutManager';
import type { WaScaleManager } from '../Services/WaScaleManager';
import type { GameScene } from './GameScene';

export class CameraManager extends Phaser.Events.EventEmitter {

    private scene: GameScene;
    private camera: Phaser.Cameras.Scene2D.Camera;
    private waScaleManager: WaScaleManager;

    private cameraBounds: { x: number, y: number };

    constructor(scene: GameScene, cameraBounds: { x: number, y: number }, waScaleManager: WaScaleManager) {
        super();
        this.scene = scene;

        this.camera = scene.cameras.main;
        this.cameraBounds = cameraBounds;

        this.waScaleManager = waScaleManager;

        this.initCamera();
    }

    public getCamera(): Phaser.Cameras.Scene2D.Camera {
        return this.camera;
    }

    public changeCameraFocus(focusOn: { x: number, y: number, width: number, height: number }, duration: number = 1000): void {
        const maxZoomModifier = 2.84; // How to get max zoom value?
        const currentZoomModifier = this.waScaleManager.zoomModifier;
        const zoomModifierChange = maxZoomModifier - currentZoomModifier;
        this.camera.stopFollow();
        this.camera.pan(
            focusOn.x + focusOn.width * 0.5,
            focusOn.y + focusOn.height * 0.5,
            duration,
            Easing.SineEaseOut, false, (camera, progress, x, y) => {
                this.scene.setZoomModifierTo(currentZoomModifier + progress * zoomModifierChange);
        });
    }

    public startFollow(target: object | Phaser.GameObjects.GameObject): void {
        this.camera.startFollow(target, true);
    }

    /**
     * Updates the offset of the character compared to the center of the screen according to the layout manager
     * (tries to put the character in the center of the remaining space if there is a discussion going on.
     */
    public updateCameraOffset(array: Box): void {
        const xCenter = (array.xEnd - array.xStart) / 2 + array.xStart;
        const yCenter = (array.yEnd - array.yStart) / 2 + array.yStart;

        const game = HtmlUtils.querySelectorOrFail<HTMLCanvasElement>("#game canvas");
        // Let's put this in Game coordinates by applying the zoom level:

        this.camera.setFollowOffset(
            ((xCenter - game.offsetWidth / 2) * window.devicePixelRatio) / this.scene.scale.zoom,
            ((yCenter - game.offsetHeight / 2) * window.devicePixelRatio) / this.scene.scale.zoom
        );
    }

    private initCamera() {
        this.camera = this.scene.cameras.main;
        this.camera.setBounds(0, 0, this.cameraBounds.x, this.cameraBounds.y);
    }
}