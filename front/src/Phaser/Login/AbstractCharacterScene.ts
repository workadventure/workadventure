import { ResizableScene } from "./ResizableScene";
import { localUserStore } from "../../Connexion/LocalUserStore";
import type { BodyResourceDescriptionInterface } from "../Entity/PlayerTextures";
import { loadWokaTexture } from "../Entity/PlayerTexturesLoadingManager";
import type { CharacterTexture } from "../../Connexion/LocalUser";
import type CancelablePromise from "cancelable-promise";
import { PlayerTextures } from "../Entity/PlayerTextures";
import { Loader } from "../Components/Loader";
import { CustomizeSceneName } from "./CustomizeScene";

export abstract class AbstractCharacterScene extends ResizableScene {
    protected playerTextures: PlayerTextures;

    constructor(params: { key: string }) {
        super(params);
        this.playerTextures = new PlayerTextures();
    }

    loadCustomSceneSelectCharacters(): Promise<BodyResourceDescriptionInterface[]> {
        const textures = PlayerTextures.PLAYER_RESOURCES;
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
        for (const textures of PlayerTextures.LAYERS) {
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
