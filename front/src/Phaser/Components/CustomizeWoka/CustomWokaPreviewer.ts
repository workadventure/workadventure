import { getPlayerAnimations, PlayerAnimationDirections, PlayerAnimationTypes } from "../../Player/Animation";

export enum CustomWokaBodyPart {
    Body = "Body",
    Eyes = "Eyes",
    Hair = "Hair",
    Clothes = "Clothes",
    Hat = "Hat",
    Accessory = "Accessory",
}

export interface CustomWokaPreviewerConfig {
    width: number;
    height: number;
    color: number;
    borderThickness: number;
    borderColor: number;
    bodyPartsScaleModifier: number;
    bodyPartsOffsetX: number;
}

export class CustomWokaPreviewer extends Phaser.GameObjects.Container {
    private background: Phaser.GameObjects.Graphics;
    private sprites: Record<CustomWokaBodyPart, Phaser.GameObjects.Sprite>;

    private animationDirection: PlayerAnimationDirections = PlayerAnimationDirections.Down;
    private moving: boolean = true;

    private config: CustomWokaPreviewerConfig;

    constructor(scene: Phaser.Scene, x: number, y: number, config: CustomWokaPreviewerConfig) {
        super(scene, x, y);

        this.config = config;

        this.sprites = {
            [CustomWokaBodyPart.Accessory]: this.scene.add
                .sprite(this.config.bodyPartsOffsetX, 0, "")
                .setScale(this.config.bodyPartsScaleModifier),
            [CustomWokaBodyPart.Body]: this.scene.add
                .sprite(this.config.bodyPartsOffsetX, 0, "")
                .setScale(this.config.bodyPartsScaleModifier),
            [CustomWokaBodyPart.Clothes]: this.scene.add
                .sprite(this.config.bodyPartsOffsetX, 0, "")
                .setScale(this.config.bodyPartsScaleModifier),
            [CustomWokaBodyPart.Eyes]: this.scene.add
                .sprite(this.config.bodyPartsOffsetX, 0, "")
                .setScale(this.config.bodyPartsScaleModifier),
            [CustomWokaBodyPart.Hair]: this.scene.add
                .sprite(this.config.bodyPartsOffsetX, 0, "")
                .setScale(this.config.bodyPartsScaleModifier),
            [CustomWokaBodyPart.Hat]: this.scene.add
                .sprite(this.config.bodyPartsOffsetX, 0, "")
                .setScale(this.config.bodyPartsScaleModifier),
        };

        this.updateSprite("accessory1", CustomWokaBodyPart.Accessory);
        this.updateSprite("body1", CustomWokaBodyPart.Body);
        this.updateSprite("clothes4", CustomWokaBodyPart.Clothes);
        this.updateSprite("eyes5", CustomWokaBodyPart.Eyes);
        this.updateSprite("hair3", CustomWokaBodyPart.Hair);
        this.updateSprite("hat2", CustomWokaBodyPart.Hat);

        this.background = this.createBackground();
        this.setSize(this.config.width, this.config.height);

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
        this.animationDirection = direction;
        this.moving = moving;
    }

    private createBackground(): Phaser.GameObjects.Graphics {
        const background = this.scene.add.graphics();
        background.fillStyle(0xffffff);
        background.lineStyle(this.config.borderThickness, 0xadafbc);

        const width = this.config.width;
        const height = this.config.height;

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
                this.moving &&
                (!sprite.anims.currentAnim || sprite.anims.currentAnim.key !== this.animationDirection)
            ) {
                sprite.play(textureKey + "-" + this.animationDirection + "-" + PlayerAnimationTypes.Walk, true);
            } else if (!this.moving) {
                sprite.anims.play(textureKey + "-" + this.animationDirection + "-" + PlayerAnimationTypes.Idle, true);
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

    public isMoving(): boolean {
        return this.moving;
    }

    public getAnimationDirection(): PlayerAnimationDirections {
        return this.animationDirection;
    }
}
