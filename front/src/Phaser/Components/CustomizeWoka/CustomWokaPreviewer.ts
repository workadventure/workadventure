import { getPlayerAnimations, PlayerAnimationDirections, PlayerAnimationTypes } from "../../Player/Animation";

export enum CustomWokaBodyPart {
    Body = "Body",
    Eyes = "Eyes",
    Hair = "Hair",
    Clothes = "Clothes",
    Hat = "Hat",
    Accessory = "Accessory",
}

export class CustomWokaPreviewer extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private sprites: Record<CustomWokaBodyPart, Phaser.GameObjects.Sprite>;

    private currentAnimationDirection: PlayerAnimationDirections = PlayerAnimationDirections.Down;
    private currentlyMoving: boolean = true;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        const spritesOffset = -2;

        this.sprites = {
            [CustomWokaBodyPart.Accessory]: this.scene.add.sprite(spritesOffset, 0, "").setScale(4),
            [CustomWokaBodyPart.Body]: this.scene.add.sprite(spritesOffset, 0, "").setScale(4),
            [CustomWokaBodyPart.Clothes]: this.scene.add.sprite(spritesOffset, 0, "").setScale(4),
            [CustomWokaBodyPart.Eyes]: this.scene.add.sprite(spritesOffset, 0, "").setScale(4),
            [CustomWokaBodyPart.Hair]: this.scene.add.sprite(spritesOffset, 0, "").setScale(4),
            [CustomWokaBodyPart.Hat]: this.scene.add.sprite(spritesOffset, 0, "").setScale(4),
        };

        this.updateSprite("accessory1", CustomWokaBodyPart.Accessory);
        this.updateSprite("body1", CustomWokaBodyPart.Body);
        this.updateSprite("clothes4", CustomWokaBodyPart.Clothes);
        this.updateSprite("eyes5", CustomWokaBodyPart.Eyes);
        this.updateSprite("hair3", CustomWokaBodyPart.Hair);
        this.updateSprite("hat2", CustomWokaBodyPart.Hat);

        const width = 150;
        const height = 200;

        this.background = this.createBackground(width, height);
        this.setSize(width, height);

        this.add([
            this.background,
            this.sprites.Body,
            this.sprites.Eyes,
            this.sprites.Hair,
            this.sprites.Clothes,
            this.sprites.Hat,
            this.sprites.Accessory,
        ]);

        this.scene.add.existing(this);
    }

    public update(): void {
        this.animate();
    }

    public changeAnimation(direction: PlayerAnimationDirections, moving: boolean): void {
        this.currentAnimationDirection = direction;
        this.currentlyMoving = moving;
    }

    private createBackground(width: number, height: number): Phaser.GameObjects.Graphics {
        const background = this.scene.add.graphics();
        background.fillStyle(0xffffff);
        background.lineStyle(5, 0xadafbc);

        background.fillRect(-width / 2, -height / 2, width, height);
        background.strokeRect(-width / 2, -height / 2, width, height);

        return background;
    }

    private animate(): void {
        for (const bodyPartKey in this.sprites) {
            const sprite = this.sprites[bodyPartKey as CustomWokaBodyPart];
            if (!sprite.anims) {
                console.error("ANIMS IS NOT DEFINED!!!");
                return;
            }
            const textureKey = sprite.texture.key;
            if (
                this.currentlyMoving &&
                (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== this.currentAnimationDirection)
            ) {
                sprite.play(textureKey + "-" + this.currentAnimationDirection + "-" + PlayerAnimationTypes.Walk, true);
            } else if (!this.currentlyMoving) {
                sprite.anims.play(
                    textureKey + "-" + this.currentAnimationDirection + "-" + PlayerAnimationTypes.Idle,
                    true
                );
            }
        }
    }

    public updateSprite(textureKey: string, bodyPart: CustomWokaBodyPart): void {
        this.sprites[bodyPart].setTexture(textureKey);
        getPlayerAnimations(textureKey).forEach((d) => {
            this.scene.anims.create({
                key: d.key,
                frames: this.scene.anims.generateFrameNumbers(d.frameModel, { frames: d.frames }),
                frameRate: d.frameRate,
                repeat: d.repeat,
            });
        });
        // Needed, otherwise, animations are not handled correctly.
        if (this.scene) {
            this.scene.sys.updateList.add(this.sprites[bodyPart]);
        }
    }
}
