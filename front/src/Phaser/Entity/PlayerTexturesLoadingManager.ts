import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import type { CharacterTexture } from "../../Connexion/LocalUser";
import { BodyResourceDescriptionInterface, LAYERS, PLAYER_RESOURCES } from "./PlayerTextures";
import CancelablePromise from "cancelable-promise";

export interface FrameConfig {
    frameWidth: number;
    frameHeight: number;
}

export const loadAllLayers = (load: LoaderPlugin): BodyResourceDescriptionInterface[][] => {
    const returnArray: BodyResourceDescriptionInterface[][] = [];
    LAYERS.forEach((layer) => {
        const layerArray: BodyResourceDescriptionInterface[] = [];
        Object.values(layer).forEach((textureDescriptor) => {
            layerArray.push(textureDescriptor);
            load.spritesheet(textureDescriptor.name, textureDescriptor.img, { frameWidth: 32, frameHeight: 32 });
        });
        returnArray.push(layerArray);
    });
    return returnArray;
};
export const loadAllDefaultModels = (load: LoaderPlugin): BodyResourceDescriptionInterface[] => {
    const returnArray = Object.values(PLAYER_RESOURCES);
    returnArray.forEach((playerResource: BodyResourceDescriptionInterface) => {
        load.spritesheet(playerResource.name, playerResource.img, { frameWidth: 32, frameHeight: 32 });
    });
    return returnArray;
};

export const loadCustomTexture = (
    loaderPlugin: LoaderPlugin,
    texture: CharacterTexture
): CancelablePromise<BodyResourceDescriptionInterface> => {
    const name = "customCharacterTexture" + texture.id;
    const playerResourceDescriptor: BodyResourceDescriptionInterface = { name, img: texture.url, level: texture.level };
    return createLoadingPromise(loaderPlugin, playerResourceDescriptor, {
        frameWidth: 32,
        frameHeight: 32,
    });
};

export const lazyLoadPlayerCharacterTextures = (
    loadPlugin: LoaderPlugin,
    texturekeys: Array<string | BodyResourceDescriptionInterface>
): CancelablePromise<string[]> => {
    const promisesList: CancelablePromise<unknown>[] = [];
    texturekeys.forEach((textureKey: string | BodyResourceDescriptionInterface) => {
        try {
            //TODO refactor
            const playerResourceDescriptor = getRessourceDescriptor(textureKey);
            if (playerResourceDescriptor && !loadPlugin.textureManager.exists(playerResourceDescriptor.name)) {
                promisesList.push(
                    createLoadingPromise(loadPlugin, playerResourceDescriptor, {
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
        returnPromise = CancelablePromise.all(promisesList).then(() => texturekeys);
    } else {
        returnPromise = CancelablePromise.resolve(texturekeys);
    }

    //If the loading fail, we render the default model instead.
    return returnPromise.then((keys) =>
        keys.map((key) => {
            return typeof key !== "string" ? key.name : key;
        })
    );
};

export const getRessourceDescriptor = (
    textureKey: string | BodyResourceDescriptionInterface
): BodyResourceDescriptionInterface => {
    if (typeof textureKey !== "string" && textureKey.img) {
        return textureKey;
    }
    const textureName: string = typeof textureKey === "string" ? textureKey : textureKey.name;
    const playerResource = PLAYER_RESOURCES[textureName];
    if (playerResource !== undefined) return playerResource;

    for (let i = 0; i < LAYERS.length; i++) {
        const playerResource = LAYERS[i][textureName];
        if (playerResource !== undefined) return playerResource;
    }
    throw new Error("Could not find a data for texture " + textureName);
};

export const createLoadingPromise = (
    loadPlugin: LoaderPlugin,
    playerResourceDescriptor: BodyResourceDescriptionInterface,
    frameConfig: FrameConfig
) => {
    return new CancelablePromise<BodyResourceDescriptionInterface>((res, rej, cancel) => {
        if (loadPlugin.textureManager.exists(playerResourceDescriptor.name)) {
            return res(playerResourceDescriptor);
        }

        cancel(() => {
            loadPlugin.off("loaderror");
            loadPlugin.off("filecomplete-spritesheet-" + playerResourceDescriptor.name);
            return;
        });

        loadPlugin.spritesheet(playerResourceDescriptor.name, playerResourceDescriptor.img, frameConfig);
        const errorCallback = (file: { src: string }) => {
            if (file.src !== playerResourceDescriptor.img) return;
            console.error("failed loading player resource: ", playerResourceDescriptor);
            rej(playerResourceDescriptor);
            loadPlugin.off("filecomplete-spritesheet-" + playerResourceDescriptor.name, successCallback);
            loadPlugin.off("loaderror", errorCallback);
        };
        const successCallback = () => {
            loadPlugin.off("loaderror", errorCallback);
            res(playerResourceDescriptor);
        };

        loadPlugin.once("filecomplete-spritesheet-" + playerResourceDescriptor.name, successCallback);
        loadPlugin.on("loaderror", errorCallback);
    });
};
