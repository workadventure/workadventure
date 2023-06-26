import { CharacterTextureMessage } from "@workadventure/messages";
import type { GameScene } from "../Game/GameScene";
import { TexturesHelper } from "../Helpers/TexturesHelper";
import { CharacterTextureError } from "../../Exception/CharacterTextureError";
import { gameManager } from "../Game/GameManager";
import { lazyLoadPlayerCharacterTextures } from "./PlayerTexturesLoadingManager";

/**
 * Class that let you generate a base64 image from a CharacterLayer[]
 */
export class CharacterLayerManager {
    static wokaBase64(characterTextures: CharacterTextureMessage[]): Promise<string> {
        const scene = gameManager.getCurrentGameScene();
        return lazyLoadPlayerCharacterTextures(
            scene.superLoad,
            characterTextures.map((texture) => ({ id: texture.id, url: texture.url }))
        )
            .then((textures) => {
                return this.getSnapshot(scene, this.getSprites(scene, textures)).then((htmlImageElementSrc) => {
                    return htmlImageElementSrc;
                });
            })
            .catch(() => {
                return lazyLoadPlayerCharacterTextures(scene.superLoad, [
                    {
                        id: "color_22",
                        url: "resources/customisation/character_color/character_color21.png",
                    },
                    {
                        id: "eyes_23",
                        url: "resources/customisation/character_eyes/character_eyes23.png",
                    },
                ])
                    .then((textures) => {
                        return this.getSnapshot(scene, this.getSprites(scene, textures)).then((htmlImageElementSrc) => {
                            return htmlImageElementSrc;
                        });
                    })
                    .catch((e) => {
                        throw e;
                    });
            });
    }

    private static async getSnapshot(
        scene: GameScene,
        sprites: Map<string, Phaser.GameObjects.Sprite>
    ): Promise<string> {
        return TexturesHelper.getSnapshot(
            scene,
            ...Array.from(sprites.values()).map((sprite) => ({ sprite, frame: 1 }))
        ).catch((reason) => {
            console.warn(reason);
            for (const sprite of sprites.values()) {
                // we can be sure that either predefined woka or body texture is at this point loaded
                if (sprite.texture.key.includes("color") || sprite.texture.key.includes("male")) {
                    return scene.textures.getBase64(sprite.texture.key);
                }
            }
            return "male1";
        });
    }

    private static getSprites(
        scene: GameScene,
        textures: string[],
        frame?: string | number
    ): Map<string, Phaser.GameObjects.Sprite> {
        const sprites = new Map<string, Phaser.GameObjects.Sprite>();
        if (textures.length < 1) {
            throw new CharacterTextureError("no texture given");
        }

        for (const texture of textures) {
            if (scene && !scene.textures.exists(texture)) {
                throw new CharacterTextureError("texture not found");
            }
            const sprite = new Phaser.GameObjects.Sprite(scene, 0, 0, texture, frame);

            sprites.set(texture, sprite);
        }
        return sprites;
    }
}
