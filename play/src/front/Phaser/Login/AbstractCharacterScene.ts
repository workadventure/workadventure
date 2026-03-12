import { PlayerTextures } from "../Entity/PlayerTextures.ts";
import { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin.ts";
import { gameManager } from "../Game/GameManager.ts";
import { ResizableScene } from "./ResizableScene.ts";

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

    create() {
        if (gameManager.currentStartedRoom.backgroundColor != undefined) {
            this.cameras.main.setBackgroundColor(gameManager.currentStartedRoom.backgroundColor);
        }
    }
}
