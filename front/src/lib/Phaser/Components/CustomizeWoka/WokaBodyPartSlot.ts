import { GridItem } from "@home-based-studio/phaser3-utils";
import { GridItemEvent } from "@home-based-studio/phaser3-utils/lib/utils/gui/containers/grids/GridItem";
import { WokaBodyPart } from "./CustomWokaPreviewer";

export interface WokaBodyPartSlotConfig {
    color: number;
    borderThickness: number;
    borderColor: number;
    borderSelectedColor: number;
    offsetX: number;
    offsetY: number;
    textureKeys: Record<WokaBodyPart, string>;
    categoryImageKey?: string;
    selected?: boolean;
}

export enum WokaBodyPartSlotEvent {
    Clicked = "WokaBodyPartSlotEvent:Clicked",
}

export class WokaBodyPartSlot extends GridItem {
    private background: Phaser.GameObjects.Image;
    private frame: Phaser.GameObjects.Graphics;
    private categoryImage?: Phaser.GameObjects.Image;
    private sprites: Record<WokaBodyPart, Phaser.GameObjects.Sprite>;

    private config: WokaBodyPartSlotConfig;

    private selected: boolean;

    public static readonly SIZE: number = 50;

    constructor(scene: Phaser.Scene, x: number, y: number, config: WokaBodyPartSlotConfig, id?: number) {
        super(scene, `${id}`, { x, y });

        this.config = config;

        const textures = this.config.textureKeys;
        this.sprites = {
            [WokaBodyPart.Accessory]: this.scene.add
                .sprite(this.config.offsetX, this.config.offsetY, textures.Accessory)
                .setVisible(textures.Accessory !== ""),
            [WokaBodyPart.Body]: this.scene.add
                .sprite(this.config.offsetX, this.config.offsetY, textures.Body)
                .setVisible(textures.Body !== ""),
            [WokaBodyPart.Clothes]: this.scene.add
                .sprite(this.config.offsetX, this.config.offsetY, textures.Clothes)
                .setVisible(textures.Clothes !== ""),
            [WokaBodyPart.Eyes]: this.scene.add
                .sprite(this.config.offsetX, this.config.offsetY, textures.Eyes)
                .setVisible(textures.Eyes !== ""),
            [WokaBodyPart.Hair]: this.scene.add
                .sprite(this.config.offsetX, this.config.offsetY, textures.Hair)
                .setVisible(textures.Hair !== ""),
            [WokaBodyPart.Hat]: this.scene.add
                .sprite(this.config.offsetX, this.config.offsetY, textures.Hat)
                .setVisible(textures.Hat !== ""),
        };

        this.selected = this.config.selected ?? false;

        this.background = this.background = this.scene.add.image(0, 0, `floorTexture0`);
        this.frame = this.scene.add.graphics();
        this.drawFrame();
        this.add([
            this.background,
            this.frame,
            this.sprites.Body,
            this.sprites.Eyes,
            this.sprites.Hair,
            this.sprites.Clothes,
            this.sprites.Hat,
            this.sprites.Accessory,
        ]);

        if (this.config.categoryImageKey) {
            this.categoryImage = this.scene.add
                .image(WokaBodyPartSlot.SIZE / 2 - 1, -WokaBodyPartSlot.SIZE / 2 + 1, this.config.categoryImageKey)
                .setDisplaySize(16, 16)
                .setAlpha(0.75)
                .setOrigin(1, 0);
            this.add(this.categoryImage);
        }

        this.setSize(WokaBodyPartSlot.SIZE, WokaBodyPartSlot.SIZE);
        this.setInteractive({ cursor: "pointer" });
        this.scene.input.setDraggable(this);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public getContentData(): Record<WokaBodyPart, string> {
        return this.config.textureKeys;
    }

    public setTextures(textureKeys: Record<WokaBodyPart, string>): void {
        this.config.textureKeys = textureKeys;
        this.sprites.Accessory.setTexture(textureKeys.Accessory).setVisible(textureKeys.Accessory !== "");
        this.sprites.Body.setTexture(textureKeys.Body).setVisible(textureKeys.Body !== "");
        this.sprites.Clothes.setTexture(textureKeys.Clothes).setVisible(textureKeys.Clothes !== "");
        this.sprites.Eyes.setTexture(textureKeys.Eyes).setVisible(textureKeys.Eyes !== "");
        this.sprites.Hair.setTexture(textureKeys.Hair).setVisible(textureKeys.Hair !== "");
        this.sprites.Hat.setTexture(textureKeys.Hat).setVisible(textureKeys.Hat !== "");
    }

    public select(select = true): void {
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

    private drawFrame(): void {
        this.frame.clear();
        this.frame.lineStyle(
            this.config.borderThickness,
            this.selected ? this.config.borderSelectedColor : this.config.borderColor
        );

        const size = WokaBodyPartSlot.SIZE;

        this.frame.strokeRect(-size / 2, -size / 2, size, size);
    }

    private updateSelected(): void {
        this.drawFrame();
    }
}
