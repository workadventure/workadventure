import { coWebsiteManager } from "../../Stores/CoWebsiteStore";
import type { Game } from "../Game/Game";
import { ResizableScene } from "../Login/ResizableScene";
import { HdpiManager } from "./HdpiManager";
import ScaleManager = Phaser.Scale.ScaleManager;

export enum WaScaleManagerEvent {
    RefreshFocusOnTarget = "wa-scale-manager:refresh-focus-on-target",
    ZoomChanged = "wa-scale-manager:zoom-changed",
}

export type WaScaleManagerFocusTarget = { x: number; y: number; width?: number; height?: number };

export class WaScaleManager {
    private hdpiManager: HdpiManager;
    private scaleManager: ScaleManager | undefined;
    private game!: Game;
    private actualZoom = 1;
    private _saveZoom = 1;
    private lastEmittedZoomModifier: number | undefined;

    private focusTarget?: WaScaleManagerFocusTarget;

    public constructor(private minGamePixelsNumber: number, private absoluteMinPixelNumber: number) {
        this.hdpiManager = new HdpiManager(minGamePixelsNumber, absoluteMinPixelNumber);
    }

    private emitZoomChangedIfNeeded(): void {
        const zoomModifier = this.hdpiManager.zoomModifier;
        if (this.lastEmittedZoomModifier === zoomModifier) {
            return;
        }

        this.lastEmittedZoomModifier = zoomModifier;
        this.game.events.emit(WaScaleManagerEvent.ZoomChanged, zoomModifier);
    }

    public setGame(game: Game): void {
        this.scaleManager = game.scale;
        this.game = game;
        this.lastEmittedZoomModifier = this.hdpiManager.zoomModifier;
    }

    public applyNewSize(camera?: Phaser.Cameras.Scene2D.Camera, animating = false): void {
        if (this.scaleManager === undefined) {
            return;
        }
        const { width, height } = coWebsiteManager.getGameSize();
        const devicePixelRatio = window.devicePixelRatio ?? 1;
        const { game: gameSize, real: realSize } = this.hdpiManager.getOptimalGameSize({
            width: width * devicePixelRatio,
            height: height * devicePixelRatio,
        });

        if (realSize.width !== 0 && gameSize.width !== 0 && devicePixelRatio !== 0) {
            this.actualZoom = realSize.width / gameSize.width / devicePixelRatio;
        }

        // The performance shows us that having a game size bigger than its real size causes many lags and bad game performance.
        // So we apply this condition: if the game size is greater than the real size, we don't zoom through the canvas.
        // To zoom in and out, we use the camera. The zoom is calculated using the optimal zoom level.
        // If the game size is smaller than the real size, we set the Phaser zoom level to 1 and we resize the canvas pixel size.
        // It's more efficient to keep the canvas as small as possible.
        // One exception: during camera zoom animations. The this.scaleManager.resize costs a lot of resources. So we don't
        // want to do this in a loop when zooming. If we are in the middle of an animation, we scale the canvas number of pixels
        // to the browser viewport and we use the Phaser camera zoom.
        if (gameSize.width <= realSize.width && gameSize.height <= realSize.height && !animating) {
            this.scaleManager.resize(gameSize.width, gameSize.height);
            this.scaleManager.setZoom(this.actualZoom);
            camera?.setZoom(1);
        } else {
            if (this.scaleManager.width !== realSize.width || this.scaleManager.height !== realSize.height) {
                this.scaleManager.resize(realSize.width, realSize.height);
            }

            const zoom =
                this.hdpiManager.zoomModifier * this.hdpiManager.getOptimalZoomLevel(realSize.width * realSize.height);
            // In the camera-zoom branch, keep the DOM and canvas layers on the same display scale.
            // The scale manager only compensates for DPR here; the gameplay zoom is fully handled by the camera.
            this.scaleManager.setZoom(1 / devicePixelRatio);
            camera?.setZoom(zoom);
        }

        // Note: onResize will be called twice (once here and once in Game.ts), but we have no better way.
        for (const scene of this.game.scene.getScenes(true)) {
            if (scene instanceof ResizableScene) {
                // We are delaying the call to the "render" event because otherwise, the "camera" coordinates are not correctly updated.
                scene.events.once(Phaser.Scenes.Events.RENDER, () => scene.onResize());
            }
        }

        this.emitZoomChangedIfNeeded();
        this.game.markDirty();
    }

    /**
     * Use this in case of resizing while focusing on something
     */
    public refreshFocusOnTarget(camera?: Phaser.Cameras.Scene2D.Camera): void {
        if (!this.focusTarget) {
            return;
        }
        if (this.focusTarget.width && this.focusTarget.height) {
            this.setZoomModifier(
                this.getTargetZoomModifierFor(this.focusTarget.width, this.focusTarget.height),
                camera
            );
        }

        this.game.events.emit(WaScaleManagerEvent.RefreshFocusOnTarget, this.focusTarget);
    }

    public setFocusTarget(targetDimensions?: WaScaleManagerFocusTarget): void {
        this.focusTarget = targetDimensions;
    }

    public getTargetZoomModifierFor(viewportWidth: number, viewportHeight: number) {
        const { width: gameWidth, height: gameHeight } = coWebsiteManager.getGameSize();
        const devicePixelRatio = window.devicePixelRatio ?? this.hdpiManager.maxZoomOut;

        const { real: realSize } = this.hdpiManager.getOptimalGameSize({
            width: gameWidth * devicePixelRatio,
            height: gameHeight * devicePixelRatio,
        });
        const desiredZoom = Math.min(realSize.width / viewportWidth, realSize.height / viewportHeight);
        const realPixelNumber = gameWidth * devicePixelRatio * gameHeight * devicePixelRatio;
        return desiredZoom / (this.hdpiManager.getOptimalZoomLevel(realPixelNumber) || 1);
    }

    public get zoomModifier(): number {
        return this.hdpiManager.zoomModifier;
    }

    public set zoomModifier(zoomModifier: number) {
        let camera = undefined;
        // Let's attempt to get the camera
        for (const scene of this.game.scene.getScenes(true)) {
            if (scene.cameras.main) {
                camera = scene.cameras.main;
            }
        }

        this.setZoomModifier(zoomModifier, camera);
    }

    public setZoomModifier(zoomModifier: number, camera?: Phaser.Cameras.Scene2D.Camera, animating = false): void {
        this.hdpiManager.zoomModifier = zoomModifier;
        this.applyNewSize(camera, animating);
    }

    public getFocusTarget(): WaScaleManagerFocusTarget | undefined {
        return this.focusTarget;
    }

    public saveZoom(): void {
        this._saveZoom = this.hdpiManager.zoomModifier;
    }

    public getSaveZoom(): number {
        return this._saveZoom;
    }

    public restoreZoom(): void {
        this.hdpiManager.zoomModifier = this._saveZoom;
        this.applyNewSize();
    }

    public getActualZoom(): number {
        return this.actualZoom;
    }

    /**
     * This is used to scale back the ui components to counter-act the zoom.
     */
    public get uiScalingFactor(): number {
        return this.actualZoom > 1 ? 1 : 1.2;
    }

    public set maxZoomOut(maxZoomOut: number) {
        this.hdpiManager.maxZoomOut = maxZoomOut;
    }
    public get maxZoomOut(): number {
        return this.hdpiManager.maxZoomOut;
    }

    public get isMaximumZoomOutReached(): boolean {
        return this.hdpiManager.isMaximumZoomReached;
    }

    public get isMaximumZoomInReached(): boolean {
        return this.hdpiManager.isMaximumZoomInReached;
    }
}

export const waScaleManager = new WaScaleManager(640 * 480, 196 * 196);
