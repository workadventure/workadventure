import {HdpiManager} from "./HdpiManager";
import ScaleManager = Phaser.Scale.ScaleManager;
import {coWebsiteManager} from "../../WebRtc/CoWebsiteManager";
import type {Game} from "../Game/Game";


class WaScaleManager {
    private hdpiManager: HdpiManager;
    private scaleManager!: ScaleManager;
    private game!: Game;

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

        this.scaleManager.setZoom(realSize.width / gameSize.width / devicePixelRatio);
        this.scaleManager.resize(gameSize.width, gameSize.height);

        // Override bug in canvas resizing in Phaser. Let's resize the canvas ourselves
        const style = this.scaleManager.canvas.style;
        style.width = Math.ceil(realSize.width / devicePixelRatio) + 'px';
        style.height = Math.ceil(realSize.height / devicePixelRatio) + 'px';

        this.game.markDirty();
    }

    public get zoomModifier(): number {
        return this.hdpiManager.zoomModifier;
    }

    public set zoomModifier(zoomModifier: number) {
        this.hdpiManager.zoomModifier = zoomModifier;
        this.applyNewSize();
    }

}

export const waScaleManager = new WaScaleManager(640*480, 196*196);
