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
export const loadCustomTexture = (load: LoaderPlugin, texture: CharacterTexture) => {
    const name = 'customCharacterTexture'+texture.id;
    load.spritesheet(name,texture.url,{frameWidth: 32, frameHeight: 32});
    return name;
}

export const lazyLoadPlayerCharacterTextures = (loadPlugin: LoaderPlugin, texturePlugin: TextureManager, texturekeys:Array<string|BodyResourceDescriptionInterface>): Promise<string[]> => {
    const promisesList:Promise<void>[] = [];
    texturekeys.forEach((textureKey: string|BodyResourceDescriptionInterface) => {
        const textureName = typeof textureKey === 'string' ? textureKey : textureKey.name;
        if(!texturePlugin.exists(textureName)) {
            console.log('Loading '+textureName)
            const playerResourceDescriptor = typeof textureKey === 'string' ? getRessourceDescriptor(textureKey) : textureKey;
            promisesList.push(createLoadingPromise(loadPlugin, playerResourceDescriptor));
        }
    })
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


const getRessourceDescriptor = (textureKey: string): BodyResourceDescriptionInterface => {
    const playerResource = PLAYER_RESOURCES[textureKey];
    if (playerResource !== undefined) return playerResource;
    
    for (let i=0; i<LAYERS.length;i++) {
        const playerResource = LAYERS[i][textureKey];
        if (playerResource !== undefined) return playerResource;
    }
    throw 'Could not find a data for texture '+textureKey;
}

const createLoadingPromise = (loadPlugin: LoaderPlugin, playerResourceDescriptor: BodyResourceDescriptionInterface) => {
    return new Promise<void>((res, rej) => {
        loadPlugin.spritesheet(playerResourceDescriptor.name, playerResourceDescriptor.img, {frameWidth: 32, frameHeight: 32});
        loadPlugin.once('filecomplete-spritesheet-'+playerResourceDescriptor.name, () => res());
    });
}