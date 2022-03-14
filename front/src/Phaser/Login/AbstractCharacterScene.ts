import { ResizableScene } from "./ResizableScene";
import { BodyResourceDescriptionInterface, PlayerTexturesKey } from "../Entity/PlayerTextures";
import { loadWokaTexture } from "../Entity/PlayerTexturesLoadingManager";
import type CancelablePromise from "cancelable-promise";
import { PlayerTextures } from "../Entity/PlayerTextures";

export abstract class AbstractCharacterScene extends ResizableScene {
    protected playerTextures: PlayerTextures;

    constructor(params: { key: string }) {
        super(params);
        this.playerTextures = new PlayerTextures();
    }

    loadCustomSceneSelectCharacters(): Promise<BodyResourceDescriptionInterface[]> {
        const textures = this.playerTextures.getTexturesResources(PlayerTexturesKey.Woka);
        const promises: CancelablePromise<BodyResourceDescriptionInterface>[] = [];
        if (textures) {
            for (const texture of Object.values(textures)) {
                if (texture.level === -1) {
                    continue;
                }
                promises.push(loadWokaTexture(this.load, texture));
            }
        }
        return Promise.all(promises);
    }

    loadSelectSceneCharacters(): Promise<BodyResourceDescriptionInterface[]> {
        const promises: CancelablePromise<BodyResourceDescriptionInterface>[] = [];
        for (const textures of this.playerTextures.getLayers()) {
            for (const texture of Object.values(textures)) {
                if (texture.level !== -1) {
                    continue;
                }
                promises.push(loadWokaTexture(this.load, texture));
            }
        }
        return Promise.all(promises);
    }
}
