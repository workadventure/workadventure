import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import { TextureError } from "../../Exception/TextureError";
import { COMPANION_RESOURCES, CompanionResourceDescriptionInterface } from "./CompanionTextures";

export const loadAll = (loader: LoaderPlugin): CompanionResourceDescriptionInterface[] => {
    const resources = COMPANION_RESOURCES;

    resources.forEach((resource: CompanionResourceDescriptionInterface) => {
        loader.spritesheet(resource.name, resource.img, { frameWidth: 32, frameHeight: 32, endFrame: 12 });
    });

    return resources;
}

export const lazyLoadResource = (loader: LoaderPlugin, name: string): Promise<string> => {
    const resource = COMPANION_RESOURCES.find(item => item.name === name);

    if (typeof resource === 'undefined') {
        throw new TextureError(`Texture '${name}' not found!`);
    }

    if (loader.textureManager.exists(resource.name)) {
        return Promise.resolve(resource.name);
    }

    return new Promise(resolve => {
        loader.spritesheet(resource.name, resource.img, { frameWidth: 32, frameHeight: 32, endFrame: 12 });
        loader.once(`filecomplete-spritesheet-${resource.name}`, () => resolve(resource.name));
    });
}
