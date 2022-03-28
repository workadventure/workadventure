import { GridItem } from "@home-based-studio/phaser3-utils";
import { GridItemEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/GridItem";
import { MathUtils } from "../../../Utils/MathUtils";

export interface WokaBodyPartSlotConfig {
    color: number;
    borderThickness: number;
    borderColor: number;
    borderSelectedColor: number;
    offsetX: number;
    offsetY: number;
    bodyImageKey?: string;
    categoryImageKey?: string;
    imageKey?: string;
    selected?: boolean;
}

export enum WokaBodyPartSlotEvent {
    Clicked = "WokaBodyPartSlotEvent:Clicked",
}

export class WokaBodyPartSlot extends GridItem {
    private background: Phaser.GameObjects.Graphics;
    private categoryImage?: Phaser.GameObjects.Image;
    private bodyImage: Phaser.GameObjects.Image;
    private image: Phaser.GameObjects.Image;

    private config: WokaBodyPartSlotConfig;

    private selected: boolean;

    public static readonly SIZE: number = 50;

    constructor(scene: Phaser.Scene, x: number, y: number, config: WokaBodyPartSlotConfig, id?: number) {
        super(scene, `${id}`, { x, y });

        this.config = config;

        this.selected = this.config.selected ?? false;

        this.background = this.scene.add.graphics();
        this.drawBackground();
        this.add(this.background);

        if (this.config.categoryImageKey) {
            this.categoryImage = this.scene.add
                .image(WokaBodyPartSlot.SIZE / 2 - 1, -WokaBodyPartSlot.SIZE / 2 + 1, this.config.categoryImageKey)
                .setDisplaySize(16, 16)
                .setAlpha(0.75)
                .setOrigin(1, 0);
            this.add(this.categoryImage);
        }

        this.bodyImage = this.scene.add
            .image(this.config.offsetX, this.config.offsetY, config.bodyImageKey ?? "")
            .setVisible(config.imageKey !== undefined);

        this.image = this.scene.add
            .image(this.config.offsetX, this.config.offsetY, config.imageKey ?? "")
            .setVisible(config.bodyImageKey !== undefined);

        this.setSize(WokaBodyPartSlot.SIZE, WokaBodyPartSlot.SIZE);

        this.add([this.bodyImage, this.image]);

        this.setInteractive({ cursor: "pointer" });
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

    private drawBackground(): void {
        this.background.clear();
        this.background.fillStyle(0xffffff);
        this.background.lineStyle(
            this.config.borderThickness,
            this.selected ? this.config.borderSelectedColor : this.config.borderColor
        );

        const size = WokaBodyPartSlot.SIZE;

        this.background.fillRect(-size / 2, -size / 2, size, size);
        this.background.strokeRect(-size / 2, -size / 2, size, size);
    }

    private updateSelected(): void {
        this.drawBackground();
    }
}
