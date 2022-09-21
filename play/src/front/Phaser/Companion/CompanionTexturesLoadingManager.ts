import LoaderPlugin = Phaser.Loader.LoaderPlugin;
import CancelablePromise from "cancelable-promise";
import {companionList, CompanionList, CompanionTexture} from "../../../messages/JsonMessages/CompanionTextures";
import {PUSHER_URL} from "../../Enum/EnvironmentVariable";
import {gameManager} from "../Game/GameManager";
import {localUserStore} from "../../Connexion/LocalUserStore";
import {SuperLoaderPlugin} from "../Services/SuperLoaderPlugin";

export function companionListMetakey() {
    return "companion-list" + gameManager.currentStartedRoom.href
}

let companionTextureList: CompanionList|null = null
export class CompanionTexturesLoadingManager {
    constructor(private superLoad: SuperLoaderPlugin, private loader: LoaderPlugin) {
    }

    loadTextures(processListCallback: (_l:CompanionList)=>void) {
        if (companionTextureList)
            return processListCallback(companionTextureList)

        this.superLoad.json(
            companionListMetakey(),
            `${PUSHER_URL}/companion/list?roomUrl=` + encodeURIComponent(gameManager.currentStartedRoom.href),
            undefined,
            {
                responseType: "text",
                headers: {
                    Authorization: localUserStore.getAuthToken() ?? "",
                },
                withCredentials: true,
            },
            (_key, _type, data) => {
                companionTextureList = companionList.parse(data)
                processListCallback(companionTextureList)
            }
        )
        .catch((e:unknown) => {
            console.error('Could not fetch companion list from pusher', e)
        })
    }

    public lazyLoadByName(textureName: string| null): CancelablePromise<string> | undefined{
        if (!textureName)
            return undefined
        return new CancelablePromise( (resolve, reject, cancel) => {
            cancel(() => {
                return;
            });

            this.loadTextures((companionList) => {
                const texture = companionList.find(t => t.name === textureName)
                if (!texture) {
                    console.error(`Companion texture ${textureName} not found`)
                    return reject(`Companion texture '${textureName}' not found!`);
                }

                this.loadByTexture(texture, resolve)

                this.loader.start(); // It's only automatically started during the Scene preload.
            })
        });
    }

    public loadByTexture(texture: CompanionTexture, onLoaded: (_textureName:string)=>void = ()=>{}) {
        if (this.loader.textureManager.exists(texture.name))
            return onLoaded(texture.name)

        this.loader.spritesheet(texture.name, texture.img, {frameWidth: 32, frameHeight: 32, endFrame: 12});
        this.loader.once(`filecomplete-spritesheet-${texture.name}`, () => onLoaded(texture.name));
    }
}
