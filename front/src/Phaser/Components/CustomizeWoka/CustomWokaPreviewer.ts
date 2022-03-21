import { MathUtils } from "../../../Utils/MathUtils";
import { getPlayerAnimations, PlayerAnimationDirections, PlayerAnimationTypes } from "../../Player/Animation";

export enum CustomWokaBodyPart {
    Body = "Body",
    Eyes = "Eyes",
    Hair = "Hair",
    Clothes = "Clothes",
    Hat = "Hat",
    Accessory = "Accessory",
}

export enum CustomWokaBodyPartOrder {
    Body,
    Eyes,
    Hair,
    Clothes,
    Hat,
    Accessory,
}

export interface CustomWokaPreviewerConfig {
    color: number;
    borderThickness: number;
    borderColor: number;
    bodyPartsOffsetX: number;
}

export class CustomWokaPreviewer extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private sprites: Record<CustomWokaBodyPart, Phaser.GameObjects.Sprite>;

    private animationDirection: PlayerAnimationDirections = PlayerAnimationDirections.Down;
    private moving: boolean = true;

    private config: CustomWokaPreviewerConfig;

    public readonly SIZE: number = 50;

    constructor(scene: Phaser.Scene, x: number, y: number, config: CustomWokaPreviewerConfig) {
        super(scene, x, y);

        this.config = config;

        this.sprites = {
            [CustomWokaBodyPart.Accessory]: this.scene.add
                .sprite(this.config.bodyPartsOffsetX, 0, "")
                .setVisible(false),
            [CustomWokaBodyPart.Body]: this.scene.add.sprite(this.config.bodyPartsOffsetX, 0, "").setVisible(false),
            [CustomWokaBodyPart.Clothes]: this.scene.add.sprite(this.config.bodyPartsOffsetX, 0, "").setVisible(false),
            [CustomWokaBodyPart.Eyes]: this.scene.add.sprite(this.config.bodyPartsOffsetX, 0, "").setVisible(false),
            [CustomWokaBodyPart.Hair]: this.scene.add.sprite(this.config.bodyPartsOffsetX, 0, "").setVisible(false),
            [CustomWokaBodyPart.Hat]: this.scene.add.sprite(this.config.bodyPartsOffsetX, 0, "").setVisible(false),
        };

        this.background = this.scene.add.graphics();
        this.drawBackground();
        this.setSize(this.SIZE, this.SIZE);

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

    // public setDisplaySize(width: number, height: number): this {
    //     const [newWidth, newHeight] = MathUtils.getWholePixelsNewSize(this.SIZE, this.SIZE, width, height);
    //     return super.setDisplaySize(newWidth, newHeight);
    // }

    public changeAnimation(direction: PlayerAnimationDirections, moving: boolean): void {
        this.animationDirection = direction;
        this.moving = moving;
    }

    public updateSprite(textureKey: string, bodyPart: CustomWokaBodyPart): void {
        this.sprites[bodyPart].anims.stop();
        this.sprites[bodyPart].setTexture(textureKey).setVisible(textureKey !== "");
        if (textureKey === "") {
            return;
        }
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

    public isMoving(): boolean {
        return this.moving;
    }

    public getAnimationDirection(): PlayerAnimationDirections {
        return this.animationDirection;
    }

    private drawBackground(): void {
        this.background.clear();
        this.background.fillStyle(0xffffff);
        this.background.lineStyle(this.config.borderThickness, 0xadafbc);

        this.background.fillRect(-this.SIZE / 2, -this.SIZE / 2, this.SIZE, this.SIZE);
        this.background.strokeRect(-this.SIZE / 2, -this.SIZE / 2, this.SIZE, this.SIZE);
    }

    private animate(): void {
        for (const bodyPartKey in this.sprites) {
            const sprite = this.sprites[bodyPartKey as CustomWokaBodyPart];
            if (!sprite.anims) {
                console.error("ANIMS IS NOT DEFINED!!!");
                return;
            }
            const textureKey = sprite.texture.key;
            if (textureKey === "__MISSING") {
                continue;
            }
            if (
                this.moving &&
                (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== this.animationDirection)
            ) {
                sprite.play(textureKey + "-" + this.animationDirection + "-" + PlayerAnimationTypes.Walk, true);
            } else if (!this.moving) {
                sprite.anims.play(textureKey + "-" + this.animationDirection + "-" + PlayerAnimationTypes.Idle, true);
            }
        }
    }
}
