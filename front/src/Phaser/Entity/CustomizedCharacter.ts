import Container = Phaser.GameObjects.Container;
import type { Scene } from "phaser";
import Sprite = Phaser.GameObjects.Sprite;
import { getPlayerAnimations, PlayerAnimationDirections, PlayerAnimationTypes } from "../Player/Animation";

/**
 * A sprite of a customized character (used in the Customize Scene only)
 */
export class CustomizedCharacter extends Container {
    private sprites: Phaser.GameObjects.Sprite[];

    public constructor(scene: Scene, x: number, y: number, layers: string[]) {
        super(scene, x, y);
        this.sprites = [];
        this.updateSprites(layers);
    }

    public updateSprites(layers: string[]): void {
        this.sprites = [];
        this.removeAll(true);
        for (const texture of layers) {
            const newSprite = new Sprite(this.scene, 0, 0, texture);
            this.sprites.push(newSprite);
            getPlayerAnimations(texture).forEach((d) => {
                this.scene.anims.create({
                    key: d.key,
                    frames: this.scene.anims.generateFrameNumbers(d.frameModel, { frames: d.frames }),
                    frameRate: d.frameRate,
                    repeat: d.repeat,
                });
            });
            // Needed, otherwise, animations are not handled correctly.
            if (this.scene) {
                this.scene.sys.updateList.add(newSprite);
            }
        }
        this.add(this.sprites);
    }

    public playAnimation(direction: PlayerAnimationDirections, moving: boolean): void {
        for (const sprite of this.sprites) {
            if (!sprite.anims) {
                console.error("ANIMS IS NOT DEFINED!!!");
                return;
            }
            const textureKey = sprite.texture.key;
            if (moving && (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== direction)) {
                sprite.play(textureKey + "-" + direction + "-" + PlayerAnimationTypes.Walk, true);
            } else if (!moving) {
                sprite.anims.play(textureKey + "-" + direction + "-" + PlayerAnimationTypes.Idle, true);
            }
        }
    }
}
