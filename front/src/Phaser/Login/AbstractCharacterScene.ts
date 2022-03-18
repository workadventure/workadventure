import { ResizableScene } from "./ResizableScene";
import { BodyResourceDescriptionInterface, PlayerTexturesKey } from "../Entity/PlayerTextures";
import { loadWokaTexture } from "../Entity/PlayerTexturesLoadingManager";
import type CancelablePromise from "cancelable-promise";
import { PlayerTextures } from "../Entity/PlayerTextures";
import Texture = Phaser.Textures.Texture;
import {SuperLoaderPlugin} from "../Services/SuperLoaderPlugin";

export abstract class AbstractCharacterScene extends ResizableScene {
    protected playerTextures: PlayerTextures;
    protected superLoad: SuperLoaderPlugin;

    constructor(params: { key: string }) {
        super(params);
        this.playerTextures = new PlayerTextures();
        this.superLoad = new SuperLoaderPlugin(this);
    }

    loadCustomSceneSelectCharacters(): Promise<BodyResourceDescriptionInterface[]> {
        const textures = this.playerTextures.getTexturesResources(PlayerTexturesKey.Woka);
        const promises: CancelablePromise<Texture>[] = [];
        const bodyResourceDescriptions: BodyResourceDescriptionInterface[] = [];
        if (textures) {
            for (const texture of Object.values(textures)) {
                if (texture.level === -1) {
                    continue;
                }
                promises.push(loadWokaTexture(this.superLoad, texture));
                bodyResourceDescriptions.push(texture);
            }
        }
        return Promise.all(promises).then(() => {
            return bodyResourceDescriptions;
        });
    }

    loadSelectSceneCharacters(): Promise<BodyResourceDescriptionInterface[]> {
        const promises: CancelablePromise<Texture>[] = [];
        const bodyResourceDescriptions: BodyResourceDescriptionInterface[] = [];
        for (const textures of this.playerTextures.getLayers()) {
            for (const texture of Object.values(textures)) {
                if (texture.level !== -1) {
                    continue;
                }
                promises.push(loadWokaTexture(this.superLoad, texture));
                bodyResourceDescriptions.push(texture);
            }
        }
        return Promise.all(promises).then(() => {
            return bodyResourceDescriptions;
        });
    }
}
