import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import { COMPANION_RESOURCES, CompanionResourceDescriptionInterface } from "./CompanionTextures";

export const loadAll = (loader: LoaderPlugin): Promise<CompanionResourceDescriptionInterface[]> => {
    const promises: Promise<string>[] = [];

    COMPANION_RESOURCES.forEach((resource: CompanionResourceDescriptionInterface) => {
        promises.push(lazyLoadResource(loader, resource.name));
    });

    return Promise.all(promises).then(() => {
        return COMPANION_RESOURCES;
    });
}

export const lazyLoadResource = (loader: LoaderPlugin, name: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const resource = COMPANION_RESOURCES.find(item => item.name === name);

        if (typeof resource === 'undefined') {
            return reject(`Texture '${name}' not found!`);
        }
    
        if (loader.textureManager.exists(resource.name)) {
            return resolve(resource.name);
        }
    
        loader.spritesheet(resource.name, resource.img, { frameWidth: 32, frameHeight: 32, endFrame: 12 });
        loader.once(`filecomplete-spritesheet-${resource.name}`, () => resolve(resource.name));
    });
}
