import { GridItem } from "@home-based-studio/phaser3-utils";
import { GridItemEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/GridItem";

export interface WokaBodyPartSlotConfig {
    color: number;
    borderThickness: number;
    borderColor: number;
    borderSelectedColor: number;
    offsetX: number;
    offsetY: number;
    bodyImageKey?: string;
    imageKey?: string;
    selected?: boolean;
}

export enum WokaBodyPartSlotEvent {
    Clicked = "WokaBodyPartSlotEvent:Clicked",
}

export class WokaBodyPartSlot extends GridItem {
    private background: Phaser.GameObjects.Rectangle;
    private bodyImage: Phaser.GameObjects.Image;
    private image: Phaser.GameObjects.Image;

    private config: WokaBodyPartSlotConfig;

    private selected: boolean;

    public readonly SIZE: number = 50;

    constructor(scene: Phaser.Scene, x: number, y: number, config: WokaBodyPartSlotConfig) {
        super(scene, undefined, { x, y });

        this.config = config;

        const offsetY = -3;
        const offsetX = -2;
        this.selected = this.config.selected ?? false;

        this.background = this.scene.add
            .rectangle(0, 0, this.SIZE, this.SIZE, this.config.color)
            .setStrokeStyle(this.config.borderThickness, this.config.borderColor);

        this.bodyImage = this.scene.add
            .image(offsetX, offsetY, config.bodyImageKey ?? "")
            .setVisible(config.imageKey !== undefined);

        this.image = this.scene.add
            .image(offsetX, offsetY, config.imageKey ?? "")
            .setVisible(config.bodyImageKey !== undefined);

        this.setSize(this.SIZE + this.config.borderThickness, this.SIZE + this.config.borderThickness);

        this.add([this.background, this.bodyImage, this.image]);

        this.setInteractive();
        this.scene.input.setDraggable(this);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public setTextures(bodyTextureKey?: string, imageTextureKey?: string): void {
        this.setBodyTexture(bodyTextureKey);
        this.setImageTexture(imageTextureKey);
    }

    public setBodyTexture(textureKey?: string, frame?: string | number): void {
        this.bodyImage.setVisible(textureKey !== undefined && textureKey !== "");
        if (textureKey) {
            this.bodyImage.setTexture(textureKey, frame);
        }
    }

    public setImageTexture(textureKey?: string, frame?: string | number): void {
        this.image.setVisible(textureKey !== undefined && textureKey !== "");
        if (textureKey) {
            this.image.setTexture(textureKey, frame);
        }
    }

    public select(select: boolean = true): void {
        if (this.selected === select) {
            return;
        }
        this.selected = select;
        this.updateSelected();
    }

    public isSelected(): boolean {
        return this.selected;
    }

    protected bindEventHandlers(): void {
        super.bindEventHandlers();

        this.on(GridItemEvent.Clicked, () => {
            this.emit(WokaBodyPartSlotEvent.Clicked, this.selected);
        });
    }

    private updateSelected(): void {
        this.background.setStrokeStyle(2.5, this.selected ? this.config.borderSelectedColor : this.config.borderColor);
    }
}
