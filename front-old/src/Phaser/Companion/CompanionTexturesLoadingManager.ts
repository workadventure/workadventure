import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import { COMPANION_RESOURCES, CompanionResourceDescriptionInterface } from "./CompanionTextures";
import CancelablePromise from "cancelable-promise";

export const getAllCompanionResources = (loader: LoaderPlugin): CompanionResourceDescriptionInterface[] => {
    COMPANION_RESOURCES.forEach((resource: CompanionResourceDescriptionInterface) => {
        lazyLoadCompanionResource(loader, resource.name).catch((e) => console.error(e));
    });

    return COMPANION_RESOURCES;
};

export const lazyLoadCompanionResource = (loader: LoaderPlugin, name: string): CancelablePromise<string> => {
    return new CancelablePromise((resolve, reject, cancel) => {
        cancel(() => {
            return;
        });

        const resource = COMPANION_RESOURCES.find((item) => item.name === name);

        if (typeof resource === "undefined") {
            return reject(`Texture '${name}' not found!`);
        }

        if (loader.textureManager.exists(resource.name)) {
            return resolve(resource.name);
        }

        loader.spritesheet(resource.name, resource.img, { frameWidth: 32, frameHeight: 32, endFrame: 12 });
        loader.once(`filecomplete-spritesheet-${resource.name}`, () => resolve(resource.name));

        loader.start(); // It's only automatically started during the Scene preload.
    });
};
