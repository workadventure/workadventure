import { GridItem } from "@home-based-studio/phaser3-utils";

export class WokaSlot extends GridItem {
    private sprite: Phaser.GameObjects.Sprite;
    private selection: Phaser.GameObjects.Rectangle;

    private readonly SIZE: number = 50;

    constructor(scene: Phaser.Scene, spriteKey: string, id?: string) {
        super(scene, id);

        this.sprite = this.scene.add.sprite(0, 0, spriteKey);
        this.selection = this.scene.add
            .rectangle(0, 0, this.SIZE, this.SIZE)
            .setStrokeStyle(1, 0xffffff)
            .setVisible(false);

        this.add([this.selection, this.sprite]);
        this.setSize(this.SIZE, this.SIZE);
        this.setInteractive({ cursor: "pointer" });
        this.scene.input.setDraggable(this);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public getSprite(): Phaser.GameObjects.Sprite {
        return this.sprite;
    }

    public select(select = true): void {
        this.selection.setVisible(select);
    }
}
