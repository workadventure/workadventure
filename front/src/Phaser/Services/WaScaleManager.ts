import { HdpiManager } from "./HdpiManager";
import ScaleManager = Phaser.Scale.ScaleManager;
import { coWebsiteManager } from "../../WebRtc/CoWebsiteManager";
import type { Game } from "../Game/Game";
import { ResizableScene } from "../Login/ResizableScene";
import { HtmlUtils } from "../../WebRtc/HtmlUtils";

export enum WaScaleManagerEvent {
    RefreshFocusOnTarget = "wa-scale-manager:refresh-focus-on-target",
}

export type WaScaleManagerFocusTarget = { x: number; y: number; width?: number; height?: number };

export class WaScaleManager {
    private hdpiManager: HdpiManager;
    private scaleManager!: ScaleManager;
    private game!: Game;
    private actualZoom: number = 1;
    private _saveZoom: number = 1;

    private focusTarget?: WaScaleManagerFocusTarget;

    public constructor(private minGamePixelsNumber: number, private absoluteMinPixelNumber: number) {
        this.hdpiManager = new HdpiManager(minGamePixelsNumber, absoluteMinPixelNumber);
    }

    public setGame(game: Game): void {
        this.scaleManager = game.scale;
        this.game = game;
    }

    public applyNewSize() {
        const { width, height } = coWebsiteManager.getGameSize();
        const devicePixelRatio = window.devicePixelRatio ?? 1;
        const { game: gameSize, real: realSize } = this.hdpiManager.getOptimalGameSize({
            width: width * devicePixelRatio,
            height: height * devicePixelRatio,
        });

        if (realSize.width !== 0 && gameSize.width !== 0 && devicePixelRatio !== 0) {
            this.actualZoom = realSize.width / gameSize.width / devicePixelRatio;
        }

        this.scaleManager.resize(gameSize.width, gameSize.height);
        this.scaleManager.setZoom(this.actualZoom);

        // Override bug in canvas resizing in Phaser. Let's resize the canvas ourselves
        const style = this.scaleManager.canvas.style;
        style.width = Math.ceil(realSize.width !== 0 ? realSize.width / devicePixelRatio : 0) + "px";
        style.height = Math.ceil(realSize.height !== 0 ? realSize.height / devicePixelRatio : 0) + "px";

        // Resize the game element at the same size at the canvas
        const gameStyle = HtmlUtils.getElementByIdOrFail<HTMLDivElement>("game").style;
        gameStyle.width = style.width;
        gameStyle.height = style.height;

        // Note: onResize will be called twice (once here and once in Game.ts), but we have no better way.
        for (const scene of this.game.scene.getScenes(true)) {
            if (scene instanceof ResizableScene) {
                // We are delaying the call to the "render" event because otherwise, the "camera" coordinates are not correctly updated.
                scene.events.once(Phaser.Scenes.Events.RENDER, () => scene.onResize());
            }
        }

        this.game.markDirty();
    }

    /**
     * Use this in case of resizing while focusing on something
     */
    public refreshFocusOnTarget(): void {
        if (!this.focusTarget) {
            return;
        }
        if (this.focusTarget.width && this.focusTarget.height) {
            this.zoomModifier = this.getTargetZoomModifierFor(this.focusTarget.width, this.focusTarget.height);
        }
        this.game.events.emit(WaScaleManagerEvent.RefreshFocusOnTarget, this.focusTarget);
    }

    public setFocusTarget(targetDimensions?: WaScaleManagerFocusTarget): void {
        this.focusTarget = targetDimensions;
    }

    public getTargetZoomModifierFor(viewportWidth: number, viewportHeight: number) {
        const { width: gameWidth, height: gameHeight } = coWebsiteManager.getGameSize();
        const devicePixelRatio = window.devicePixelRatio ?? 1;

        const { game: gameSize, real: realSize } = this.hdpiManager.getOptimalGameSize({
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
        this.hdpiManager.zoomModifier = zoomModifier;
        this.applyNewSize();
    }

    public handleZoomByFactor(zoomFactor: number): void {
        this.zoomModifier *= zoomFactor;
        if (this.focusTarget) {
            this.game.events.emit(WaScaleManagerEvent.RefreshFocusOnTarget, this.focusTarget);
        }
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

    /**
     * This is used to scale back the ui components to counter-act the zoom.
     */
    public get uiScalingFactor(): number {
        return this.actualZoom > 1 ? 1 : 1.2;
    }
}

export const waScaleManager = new WaScaleManager(640 * 480, 196 * 196);
