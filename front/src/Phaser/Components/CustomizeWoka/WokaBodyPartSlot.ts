import { GridItem } from "@home-based-studio/phaser3-utils";
import { GridItemEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/GridItem";

export interface WokaBodyPartSlotConfig {
    width: number;
    height: number;
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

export class WokaBodyPartSlot extends GridItem {
    private background: Phaser.GameObjects.Rectangle;
    private bodyImage: Phaser.GameObjects.Image;
    private image: Phaser.GameObjects.Image;

    private config: WokaBodyPartSlotConfig;

    private selected: boolean;

    constructor(scene: Phaser.Scene, x: number, y: number, config: WokaBodyPartSlotConfig) {
        super(scene, undefined, { x, y });

        this.config = config;

        const offsetY = -3;
        const offsetX = -2;
        this.selected = this.config.selected ?? false;

        this.background = this.scene.add
            .rectangle(0, 0, this.config.width, this.config.height, this.config.color)
            .setStrokeStyle(this.config.borderThickness, this.config.borderColor);

        this.bodyImage = this.scene.add
            .image(offsetX, offsetY, config.bodyImageKey ?? `body${Math.floor(Math.random() * 33) + 1}`)
            .setScale(2);

        this.image = this.scene.add
            .image(offsetX, offsetY, config.imageKey ?? "")
            .setScale(2)
            .setVisible(config.imageKey !== undefined);

        this.setSize(this.config.width + this.config.borderThickness, this.config.height + this.config.borderThickness);

        this.add([this.background, this.bodyImage, this.image]);

        this.setInteractive();
        this.scene.input.setDraggable(this);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public setBodyTexture(textureKey: string, frame?: string | number): void {
        this.bodyImage.setTexture(textureKey, frame);
    }

    public setImageTexture(textureKey?: string, frame?: string | number): void {
        this.image.setVisible(textureKey !== undefined || textureKey !== "");
        if (textureKey) {
            this.bodyImage.setTexture(textureKey, frame);
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
            this.select(!this.selected);
            // this.emit(CategoryGridItemEvent.Selected, this.categoryName);
        });
    }

    private updateSelected(): void {
        this.background.setStrokeStyle(2.5, this.selected ? this.config.borderSelectedColor : this.config.borderColor);
    }
}
