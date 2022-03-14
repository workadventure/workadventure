import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import type { CharacterTexture } from "../../Connexion/LocalUser";
import { BodyResourceDescriptionInterface, mapLayerToLevel, PlayerTextures, PlayerTexturesKey } from "./PlayerTextures";
import CancelablePromise from "cancelable-promise";

export interface FrameConfig {
    frameWidth: number;
    frameHeight: number;
}

export const loadAllLayers = (
    load: LoaderPlugin,
    playerTextures: PlayerTextures
): BodyResourceDescriptionInterface[][] => {
    const returnArray: BodyResourceDescriptionInterface[][] = [];
    playerTextures.getLayers().forEach((layer) => {
        const layerArray: BodyResourceDescriptionInterface[] = [];
        Object.values(layer).forEach((textureDescriptor) => {
            layerArray.push(textureDescriptor);
            load.spritesheet(textureDescriptor.id, textureDescriptor.img, { frameWidth: 32, frameHeight: 32 });
        });
        returnArray.push(layerArray);
    });
    return returnArray;
};
export const loadAllDefaultModels = (
    load: LoaderPlugin,
    playerTextures: PlayerTextures
): BodyResourceDescriptionInterface[] => {
    const returnArray = Object.values(playerTextures.getTexturesResources(PlayerTexturesKey.Woka));
    returnArray.forEach((playerResource: BodyResourceDescriptionInterface) => {
        load.spritesheet(playerResource.id, playerResource.img, { frameWidth: 32, frameHeight: 32 });
    });
    return returnArray;
};

export const loadWokaTexture = (
    loaderPlugin: LoaderPlugin,
    texture: BodyResourceDescriptionInterface
): CancelablePromise<BodyResourceDescriptionInterface> => {
    return createLoadingPromise(loaderPlugin, texture, {
        frameWidth: 32,
        frameHeight: 32,
    });
};

export const lazyLoadPlayerCharacterTextures = (
    loadPlugin: LoaderPlugin,
    textures: BodyResourceDescriptionInterface[]
): CancelablePromise<string[]> => {
    const promisesList: CancelablePromise<unknown>[] = [];
    textures.forEach((texture) => {
        try {
            //TODO refactor
            if (!loadPlugin.textureManager.exists(texture.id)) {
                promisesList.push(
                    createLoadingPromise(loadPlugin, texture, {
                        frameWidth: 32,
                        frameHeight: 32,
                    })
                );
            }
        } catch (err) {
            console.error(err);
        }
    });
    let returnPromise: CancelablePromise<Array<string | BodyResourceDescriptionInterface>>;
    if (promisesList.length > 0) {
        loadPlugin.start();
        returnPromise = CancelablePromise.all(promisesList).then(() => textures);
    } else {
        returnPromise = CancelablePromise.resolve(textures);
    }

    //If the loading fail, we render the default model instead.
    return returnPromise.then((keys) =>
        keys.map((key) => {
            return typeof key !== "string" ? key.id : key;
        })
    );
};

export const createLoadingPromise = (
    loadPlugin: LoaderPlugin,
    playerResourceDescriptor: BodyResourceDescriptionInterface,
    frameConfig: FrameConfig
) => {
    return new CancelablePromise<BodyResourceDescriptionInterface>((res, rej, cancel) => {
        if (loadPlugin.textureManager.exists(playerResourceDescriptor.id)) {
            return res(playerResourceDescriptor);
        }

        cancel(() => {
            loadPlugin.off("loaderror");
            loadPlugin.off("filecomplete-spritesheet-" + playerResourceDescriptor.id);
            return;
        });

        // If for some reason, the "img" is empty, let's reject the promise.
        if (!playerResourceDescriptor.img) {
            console.warn("Tried to load an empty texture for a Woka");
            rej(playerResourceDescriptor);
            return;
        }
        loadPlugin.spritesheet(playerResourceDescriptor.id, playerResourceDescriptor.img, frameConfig);
        const errorCallback = (file: { src: string }) => {
            if (file.src !== playerResourceDescriptor.img) return;
            console.error("failed loading player resource: ", playerResourceDescriptor);
            rej(playerResourceDescriptor);
            loadPlugin.off("filecomplete-spritesheet-" + playerResourceDescriptor.id, successCallback);
            loadPlugin.off("loaderror", errorCallback);
        };
        const successCallback = () => {
            loadPlugin.off("loaderror", errorCallback);
            res(playerResourceDescriptor);
        };

        loadPlugin.once("filecomplete-spritesheet-" + playerResourceDescriptor.id, successCallback);
        loadPlugin.on("loaderror", errorCallback);
    });
};
