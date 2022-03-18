
import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import {BodyResourceDescriptionInterface} from "../Entity/PlayerTextures";
import CancelablePromise from "cancelable-promise";
import {FrameConfig} from "../Entity/PlayerTexturesLoadingManager";
import {Scene} from "phaser";

/**
 * A wrapper around Phaser LoaderPlugin. Each method returns a (cancelable) Promise that resolves as soon as
 * the file is loaded.
 *
 * As a bonus, if the scene is destroyed BEFORE the promise resolves, the promise is canceled automatically.
 * So there is no risk of trying to add a resource on a closed scene.
 */
export class SuperLoaderPlugin {
    constructor(private scene: Scene) {
    }

    public spritesheet(key: string, url: string, frameConfig?: Phaser.Types.Loader.FileTypes.ImageFrameConfig, xhrSettings?: Phaser.Types.Loader.XHRSettingsObject)
    {
        return new CancelablePromise<Phaser.Textures.Texture>((res, rej, cancel) => {
            if (this.scene.scene.settings.status === Phaser.Scenes.DESTROYED) {
                rej(new Error('Trying to load a spritesheet in a Scene that is already destroyed.'));
            }

            if (this.scene.load.textureManager.exists(key)) {
                return res(this.scene.load.textureManager.get(key));
            }

            // If for some reason, the "url" is empty, let's reject the promise.
            if (!url) {
                console.error("Tried to load an empty texture. URL is missing.");
                rej(new Error('Failed loading spritesheet: URL is empty'));
                return;
            }

            let destroySceneEventRegistered = false;

            const unloadCallbacks = () => {
                this.scene.load.off("filecomplete-spritesheet-" + key, successCallback);
                this.scene.load.off("loaderror", errorCallback);
                if (destroySceneEventRegistered) {
                    this.scene.events.off(Phaser.Scenes.Events.DESTROY, unloadCallbacks);
                }
            }

            const errorCallback = (file: { src: string }) => {
                if (file.src !== url) return;
                console.error("Failed loading spritesheet: ", url);
                rej(new Error('Failed loading spritesheet: "' + url + '"'));
                unloadCallbacks();
            };

            const successCallback = () => {
                this.scene.load.off("loaderror", errorCallback);
                this.scene.events.off(Phaser.Scenes.Events.DESTROY, unloadCallbacks);
                res(this.scene.load.textureManager.get(key));
            };

            cancel(() => {
                unloadCallbacks();
            });

            this.scene.load.spritesheet(key, url, frameConfig, xhrSettings);

            this.scene.load.once("filecomplete-spritesheet-" + key, successCallback);
            this.scene.load.on("loaderror", errorCallback);
            // When the scene is destroyed, let's remove our callbacks.
            // We only need to register this destroy event is the scene is not in loading state (otherwise, Phaser
            // will take care of that for us).
            if (this.scene.scene.settings.status === Phaser.Scenes.LOADING) {
                destroySceneEventRegistered = true;
                this.scene.events.once(Phaser.Scenes.Events.DESTROY, unloadCallbacks);
            }

            if (this.scene.scene.settings.status !== Phaser.Scenes.LOADING) {
                this.scene.load.start();
                // Due to a bug, if the loader is already started, additional items are not added.... unless we
                // explicitly call the "update" method.
                this.scene.load.update();
            }
        });
    };
}
