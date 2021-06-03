import {HdpiManager} from "./HdpiManager";
import ScaleManager = Phaser.Scale.ScaleManager;
import {coWebsiteManager} from "../../WebRtc/CoWebsiteManager";
import type {Game} from "../Game/Game";
import {ResizableScene} from "../Login/ResizableScene";


class WaScaleManager {
    private hdpiManager: HdpiManager;
    private scaleManager!: ScaleManager;
    private game!: Game;
    private actualZoom: number = 1;
    private _saveZoom: number = 1;

    public constructor(private minGamePixelsNumber: number, private absoluteMinPixelNumber: number) {
        this.hdpiManager = new HdpiManager(minGamePixelsNumber, absoluteMinPixelNumber);
    }

    public setGame(game: Game): void {
        this.scaleManager = game.scale;
        this.game = game;
    }

    public applyNewSize() {
        const {width, height} = coWebsiteManager.getGameSize();

        let devicePixelRatio = 1;
        if (window.devicePixelRatio) {
            devicePixelRatio = window.devicePixelRatio;
        }

        const { game: gameSize, real: realSize } = this.hdpiManager.getOptimalGameSize({width: width * devicePixelRatio, height: height * devicePixelRatio});

        this.actualZoom = realSize.width / gameSize.width / devicePixelRatio;
        this.scaleManager.setZoom(realSize.width / gameSize.width / devicePixelRatio)
        this.scaleManager.resize(gameSize.width, gameSize.height);

        // Override bug in canvas resizing in Phaser. Let's resize the canvas ourselves
        const style = this.scaleManager.canvas.style;
        style.width = Math.ceil(realSize.width / devicePixelRatio) + 'px';
        style.height = Math.ceil(realSize.height / devicePixelRatio) + 'px';
        // Note: onResize will be called twice (once here and once is Game.ts), but we have no better way.
        for (const scene of this.game.scene.getScenes(true)) {
            if (scene instanceof ResizableScene) {
                scene.onResize();
            }
        }

        this.game.markDirty();
    }

    public get zoomModifier(): number {
        return this.hdpiManager.zoomModifier;
    }

    public set zoomModifier(zoomModifier: number) {
        this.hdpiManager.zoomModifier = zoomModifier;
        this.applyNewSize();
    }

    public saveZoom(): void {
        this._saveZoom = this.hdpiManager.zoomModifier;
        console.log(this._saveZoom);
    }

    public restoreZoom(): void{
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

export const waScaleManager = new WaScaleManager(640*480, 196*196);
