import CancelablePromise from "cancelable-promise";
import { Scene } from "phaser";
import Texture = Phaser.Textures.Texture;

/**
 * A wrapper around Phaser LoaderPlugin. Each method returns a (cancelable) Promise that resolves as soon as
 * the file is loaded.
 *
 * As a bonus, if the scene is destroyed BEFORE the promise resolves, the promise is canceled automatically.
 * So there is no risk of trying to add a resource on a closed scene.
 */
export class SuperLoaderPlugin {
    constructor(private scene: Scene) {}

    public spritesheet(
        key: string,
        url: string,
        frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig,
        xhrSettings?: Phaser.Types.Loader.XHRSettingsObject
    ) {
        return this.loadResource<Texture>(
            () => {
                this.scene.load.spritesheet(key, url, frameConfig, xhrSettings);
            },
            key,
            url,
            () => {
                if (this.scene.load.textureManager.exists(key)) {
                    return this.scene.load.textureManager.get(key);
                }
                return undefined;
            },
            "spritesheet"
        );
    }

    public image(key: string, url: string, xhrSettings?: Phaser.Types.Loader.XHRSettingsObject) {
        return this.loadResource<Texture>(
            () => {
                this.scene.load.image(key, url, xhrSettings);
            },
            key,
            url,
            () => {
                if (this.scene.load.textureManager.exists(key)) {
                    return this.scene.load.textureManager.get(key);
                }
                return undefined;
            },
            "image"
        );
    }

    /**
     * @param callback The function that calls the loader to load a resource
     * @param key The key of the resource to be loaded
     * @param fromCache A function that checks in the cache if the resource is already available
     * @param type The type of resource loaded
     * @private
     */
    private loadResource<T>(
        callback: () => void,
        key: string,
        url: string,
        fromCache: () => T | undefined,
        type: string
    ): CancelablePromise<T> {
        // If for some reason, the "url" is empty, let's reject the promise.
        if (!url) {
            console.error("Tried to load an empty " + type + ". URL is missing.");
            return CancelablePromise.reject(Error("Failed loading " + type + ": URL is empty"));
        }

        return new CancelablePromise<T>((res, rej, cancel) => {
            if (this.scene.scene.settings.status === Phaser.Scenes.DESTROYED) {
                rej(new Error("Trying to load a " + type + " in a Scene that is already destroyed."));
            }

            const resource = fromCache();
            if (resource !== undefined) {
                return res(resource);
            }

            let destroySceneEventRegistered = false;

            const unloadCallbacks = () => {
                this.scene.load.off("filecomplete-" + type + "-" + key, successCallback);
                this.scene.load.off("loaderror", errorCallback);
                if (destroySceneEventRegistered) {
                    this.scene.events.off(Phaser.Scenes.Events.DESTROY, unloadCallbacks);
                }
            };

            const errorCallback = (file: { src: string }) => {
                if (file.src !== url) return;
                console.error("Failed loading " + type + ": ", url);
                rej(new Error('Failed loading "+type+": "' + url + '"'));
                unloadCallbacks();
            };

            const successCallback = () => {
                this.scene.load.off("loaderror", errorCallback);
                this.scene.events.off(Phaser.Scenes.Events.DESTROY, unloadCallbacks);
                const resource = fromCache();
                if (!resource) {
                    return rej(new Error("Newly loaded resource not available in cache"));
                }
                res(resource);
            };

            cancel(() => {
                unloadCallbacks();
            });

            callback();

            this.scene.load.once("filecomplete-" + type + "-" + key, successCallback);
            this.scene.load.on("loaderror", errorCallback);
            if (this.scene.scene.settings.status > Phaser.Scenes.LOADING) {
                // When the scene is destroyed, let's remove our callbacks.
                // We only need to register this destroy event is the scene is not in loading state (otherwise, Phaser
                // will take care of that for us).
                destroySceneEventRegistered = true;
                this.scene.events.once(Phaser.Scenes.Events.DESTROY, unloadCallbacks);

                // Let's start the loader if we are no more in the scene loading state
                this.scene.load.start();
                // Due to a bug, if the loader is already started, additional items are not added.... unless we
                // explicitly call the "update" method.
                this.scene.load.update();
            }
        });
    }
}
