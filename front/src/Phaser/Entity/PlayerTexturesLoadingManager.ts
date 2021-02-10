import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import TextureManager = Phaser.Textures.TextureManager;
import {CharacterTexture} from "../../Connexion/LocalUser";
import {BodyResourceDescriptionInterface, LAYERS, PLAYER_RESOURCES} from "./PlayerTextures";


export const loadAllLayers = (load: LoaderPlugin): BodyResourceDescriptionInterface[][] => {
    const returnArray:BodyResourceDescriptionInterface[][] = [];
    LAYERS.forEach(layer => {
        const layerArray:BodyResourceDescriptionInterface[] = [];
        Object.values(layer).forEach((textureDescriptor) => {
            layerArray.push(textureDescriptor);
            load.spritesheet(textureDescriptor.name,textureDescriptor.img,{frameWidth: 32, frameHeight: 32});
        })
        returnArray.push(layerArray)
    });
    return returnArray;
}
export const loadAllDefaultModels = (load: LoaderPlugin): BodyResourceDescriptionInterface[] => {
    const returnArray = Object.values(PLAYER_RESOURCES);
    returnArray.forEach((playerResource: BodyResourceDescriptionInterface) => {
        load.spritesheet(playerResource.name, playerResource.img, {frameWidth: 32, frameHeight: 32});
    });
    return returnArray;
}

export const loadCustomTexture = (loaderPlugin: LoaderPlugin, texture: CharacterTexture) : Promise<BodyResourceDescriptionInterface> => {
    const name = 'customCharacterTexture'+texture.id;
    const playerResourceDescriptor: BodyResourceDescriptionInterface = {name, img: texture.url, level: texture.level}
    return createLoadingPromise(loaderPlugin, playerResourceDescriptor);
}

export const lazyLoadPlayerCharacterTextures = (loadPlugin: LoaderPlugin, texturekeys:Array<string|BodyResourceDescriptionInterface>): Promise<string[]> => {
    const promisesList:Promise<unknown>[] = [];
    texturekeys.forEach((textureKey: string|BodyResourceDescriptionInterface) => {
        try {
            //TODO refactor
            const playerResourceDescriptor = getRessourceDescriptor(textureKey);
            if (playerResourceDescriptor && !loadPlugin.textureManager.exists(playerResourceDescriptor.name)) {
                promisesList.push(createLoadingPromise(loadPlugin, playerResourceDescriptor));
            }
        }catch (err){
            console.error(err);
        }
    });
    let returnPromise:Promise<Array<string|BodyResourceDescriptionInterface>>;
    if (promisesList.length > 0) {
        loadPlugin.start();
        returnPromise = Promise.all(promisesList).then(() => texturekeys);
    } else {
        returnPromise = Promise.resolve(texturekeys);
    }
    return returnPromise.then((keys) => keys.map((key) => {
        return typeof key !== 'string' ? key.name : key;
    }))
}

export const getRessourceDescriptor = (textureKey: string|BodyResourceDescriptionInterface): BodyResourceDescriptionInterface => {
    if (typeof textureKey !== 'string' && textureKey.img) {
        return textureKey;
    }
    const textureName:string = typeof textureKey === 'string' ? textureKey : textureKey.name;
    const playerResource = PLAYER_RESOURCES[textureName];
    if (playerResource !== undefined) return playerResource;
    
    for (let i=0; i<LAYERS.length;i++) {
        const playerResource = LAYERS[i][textureName];
        if (playerResource !== undefined) return playerResource;
    }
    throw 'Could not find a data for texture '+textureName;
}

const createLoadingPromise = (loadPlugin: LoaderPlugin, playerResourceDescriptor: BodyResourceDescriptionInterface) => {
    return new Promise<BodyResourceDescriptionInterface>((res) => {
        if (loadPlugin.textureManager.exists(playerResourceDescriptor.name)) {
            return res(playerResourceDescriptor);
        }
        loadPlugin.spritesheet(playerResourceDescriptor.name, playerResourceDescriptor.img, {
            frameWidth: 32,
            frameHeight: 32
        });
        loadPlugin.once('filecomplete-spritesheet-' + playerResourceDescriptor.name, () => res(playerResourceDescriptor));
    });
}