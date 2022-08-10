import { ITiledMapRectangleObject } from "@workadventure/map-editor-types";

export enum AreaPreviewEvent {
    Clicked = "Clicked",
    DoubleClicked = "DoubleClicked",
}

export class AreaPreview extends Phaser.GameObjects.Container {
    private config: ITiledMapRectangleObject;

    private preview: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, config: ITiledMapRectangleObject) {
        super(scene, config.x + config.width * 0.5, config.y + config.height * 0.5);

        this.config = config;

        this.preview = this.createPreview(config);

        this.add([this.preview]);

        const bounds = this.getBounds();
        this.setSize(bounds.width, bounds.height);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public setVisible(value: boolean): this {
        this.preview.setVisible(value);
        return this;
    }

    public updatePreview(config: ITiledMapRectangleObject): void {
        this.config = {
            ...this.config,
            ...config,
        };
        this.setPosition(config.x + config.width * 0.5, config.y + config.height * 0.5);
        this.preview.displayWidth = config.width;
        this.preview.displayHeight = config.height;
    }

    private createPreview(config: ITiledMapRectangleObject): Phaser.GameObjects.Rectangle {
        return this.scene.add
            .rectangle(0, 0, config.width, config.height, 0x0000ff, 0.5)
            .setInteractive({ cursor: "pointer" });
    }

    private bindEventHandlers(): void {
        this.preview.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
            if ((pointer.event.target as Element)?.localName !== "canvas") {
                return;
            }
            this.emit(AreaPreviewEvent.Clicked);
        });
    }

    public getConfig(): ITiledMapRectangleObject {
        return this.config;
    }

    public getName(): string {
        return this.config.name;
    }

    public getId(): number {
        return this.config.id;
    }
}
