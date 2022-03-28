import { ResizableScene } from "./ResizableScene";
import { BodyResourceDescriptionInterface, PlayerTexturesKey } from "../Entity/PlayerTextures";
import { loadWokaTexture } from "../Entity/PlayerTexturesLoadingManager";
import type CancelablePromise from "cancelable-promise";
import { PlayerTextures } from "../Entity/PlayerTextures";
import Texture = Phaser.Textures.Texture;
import { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";

export abstract class AbstractCharacterScene extends ResizableScene {
    protected playerTextures: PlayerTextures;
    protected superLoad: SuperLoaderPlugin;

    constructor(params: { key: string }) {
        super(params);
        this.playerTextures = new PlayerTextures();
        this.superLoad = new SuperLoaderPlugin(this);
    }
}
