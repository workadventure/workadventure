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
    private background: Phaser.GameObjects.Rectangle;

    private sprites: Record<CustomWokaBodyPart, Phaser.GameObjects.Sprite>;

    constructor(scene: Phaser.Scene, x: number, y: number) {
        super(scene, x, y);

        this.sprites = {
            [CustomWokaBodyPart.Accessory]: this.scene.add.sprite(0, 0, "").setScale(4),
            [CustomWokaBodyPart.Body]: this.scene.add.sprite(0, 0, "").setScale(4),
            [CustomWokaBodyPart.Clothes]: this.scene.add.sprite(0, 0, "").setScale(4),
            [CustomWokaBodyPart.Eyes]: this.scene.add.sprite(0, 0, "").setScale(4),
            [CustomWokaBodyPart.Hair]: this.scene.add.sprite(0, 0, "").setScale(4),
            [CustomWokaBodyPart.Hat]: this.scene.add.sprite(0, 0, "").setScale(4),
        };

        this.updateSprite("accessory1", CustomWokaBodyPart.Accessory);
        this.updateSprite("body1", CustomWokaBodyPart.Body);
        this.updateSprite("clothes4", CustomWokaBodyPart.Clothes);
        this.updateSprite("eyes5", CustomWokaBodyPart.Eyes);
        this.updateSprite("hair3", CustomWokaBodyPart.Hair);
        this.updateSprite("hat2", CustomWokaBodyPart.Hat);

        this.background = this.createBackground();
        this.setSize(this.background.displayWidth, this.background.displayHeight);

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
        this.playAnimation(PlayerAnimationDirections.Down, true);
    }

    private createBackground(): Phaser.GameObjects.Rectangle {
        return this.scene.add.rectangle(0, 0, 150, 300, 0xbfbfbf, 0.5);
    }

    public playAnimation(direction: PlayerAnimationDirections, moving: boolean): void {
        for (const bodyPartKey in this.sprites) {
            const sprite = this.sprites[bodyPartKey as CustomWokaBodyPart];
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
