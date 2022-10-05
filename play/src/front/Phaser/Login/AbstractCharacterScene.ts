import { ResizableScene } from "./ResizableScene";
import { PlayerTextures } from "../Entity/PlayerTextures";
import { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";

export abstract class AbstractCharacterScene extends ResizableScene {
    protected playerTextures: PlayerTextures;
    protected superLoad: SuperLoaderPlugin;

    constructor(params: { key: string }) {
        super(params);
        this.playerTextures = new PlayerTextures();
        this.superLoad = new SuperLoaderPlugin(this);
    }

    preload() {
        this.input.dragDistanceThreshold = 10;
    }
}
