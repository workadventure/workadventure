import { ITiledMapObject } from "../../Map/ITiledMap";

// NOTE: Same as IArea - Consider merging in the future? Don't want to make 2 features dependent on one type.
export type AreaPreviewConfig = Omit<
    ITiledMapObject,
    "id" | "gid" | "visible" | "rotation" | "ellipse" | "polygon" | "polyline"
>;

export enum AreaPreviewEvent {
    Clicked = "Clicked",
    DoubleClicked = "DoubleClicked",
}

export class AreaPreview extends Phaser.GameObjects.Container {
    private config: AreaPreviewConfig;

    private preview: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, config: AreaPreviewConfig) {
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

    private createPreview(config: AreaPreviewConfig): Phaser.GameObjects.Rectangle {
        return this.scene.add
            .rectangle(0, 0, config.width, config.height, 0x0000ff, 0.5)
            .setInteractive({ cursor: "pointer" });
    }

    private bindEventHandlers(): void {
        this.preview.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.emit(AreaPreviewEvent.Clicked);
        });
    }
}
