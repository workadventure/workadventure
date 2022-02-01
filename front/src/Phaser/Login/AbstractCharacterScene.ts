import { ResizableScene } from "./ResizableScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import type { BodyResourceDescriptionInterface } from "../Entity/PlayerTextures";
import { loadCustomTexture } from "../Entity/PlayerTexturesLoadingManager";
import type { CharacterTexture } from "../../Connexion/LocalUser";
import type CancelablePromise from "cancelable-promise";

export abstract class AbstractCharacterScene extends ResizableScene {
    loadCustomSceneSelectCharacters(): Promise<BodyResourceDescriptionInterface[]> {
        const textures = this.getTextures();
        const promises: CancelablePromise<BodyResourceDescriptionInterface>[] = [];
        if (textures) {
            for (const texture of textures) {
                if (texture.level === -1) {
                    continue;
                }
                promises.push(loadCustomTexture(this.load, texture));
            }
        }
        return Promise.all(promises);
    }

    loadSelectSceneCharacters(): Promise<BodyResourceDescriptionInterface[]> {
        const textures = this.getTextures();
        const promises: CancelablePromise<BodyResourceDescriptionInterface>[] = [];
        if (textures) {
            for (const texture of textures) {
                if (texture.level !== -1) {
                    continue;
                }
                promises.push(loadCustomTexture(this.load, texture));
            }
        }
        return Promise.all(promises);
    }

    private getTextures(): CharacterTexture[] | undefined {
        const localUser = localUserStore.getLocalUser();
        return localUser?.textures;
    }
}
