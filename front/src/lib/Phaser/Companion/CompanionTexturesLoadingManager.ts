import CancelablePromise from "cancelable-promise";
import { CompanionTextureCollection, CompanionTexture } from "@workadventure/messages";
import { gameManager } from "../Game/GameManager";
import { localUserStore } from "../../Connection/LocalUserStore";
import type { SuperLoaderPlugin } from "../Services/SuperLoaderPlugin";
import { ABSOLUTE_PUSHER_URL } from "../../Enum/ComputedConst";
import { CompanionTextureDescriptionInterface, CompanionTextures } from "./CompanionTextures";
import LoaderPlugin = Phaser.Loader.LoaderPlugin;

export function companionListMetakey() {
    return "companion-list" + gameManager.currentStartedRoom.href;
}

export function lazyLoadPlayerCompanionTexture(
    superLoaderPlugin: SuperLoaderPlugin,
    texture: CompanionTextureDescriptionInterface
): CancelablePromise<string> {
    const promise = superLoaderPlugin.spritesheet(texture.id, texture.url, {
        frameWidth: 32,
        frameHeight: 32,
    });

    return promise.then(() => {
        return texture.id;
    });
}

export class CompanionTexturesLoadingManager {
    constructor(private superLoad: SuperLoaderPlugin, private loader: LoaderPlugin) {}

    loadTextures(processListCallback: (_l: CompanionTextureCollection[]) => void) {
        this.superLoad
            .json(
                companionListMetakey(),
                new URL(
                    `companion/list?roomUrl=` + encodeURIComponent(gameManager.currentStartedRoom.href),
                    ABSOLUTE_PUSHER_URL
                ).toString(),
                undefined,
                {
                    responseType: "text",
                    headers: {
                        Authorization: localUserStore.getAuthToken() ?? "",
                    },
                    withCredentials: true,
                },
                (_key, _type, data) => {
                    processListCallback(CompanionTextureCollection.array().parse(data));
                }
            )
            .catch((e: unknown) => {
                console.error("Could not fetch companion list from pusher", e);
            });
    }

    loadModels(load: LoaderPlugin, companionTextures: CompanionTextures): CompanionTexture[] {
        const returnArray = Object.values(companionTextures.getCompanionResources());
        returnArray.forEach((companionResource) => {
            if (!companionResource.url) {
                console.warn("Companion resource has no URL", companionResource);
                return;
            }
            load.spritesheet(companionResource.id, companionResource.url, { frameWidth: 32, frameHeight: 32 });
        });
        return returnArray;
    }
}
