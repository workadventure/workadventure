import { ITiledMapObject } from "../../Map/ITiledMap";

// NOTE: Same as IArea - Consider merging in the future? Don't want to make 2 features dependent on one type.
export type AreaPreviewConfig = Omit<
    ITiledMapObject,
    "id" | "gid" | "visible" | "rotation" | "ellipse" | "polygon" | "polyline"
>;

export class AreaPreview extends Phaser.GameObjects.Container {
    private config: AreaPreviewConfig;

    private preview: Phaser.GameObjects.Rectangle;

    constructor(scene: Phaser.Scene, config: AreaPreviewConfig) {
        super(scene, config.x, config.y);

        this.config = config;

        this.preview = this.createPreview();

        this.add([this.preview]);

        const bounds = this.getBounds();
        this.setSize(bounds.width, bounds.height);

        this.scene.add.existing(this);
    }

    private createPreview(): Phaser.GameObjects.Rectangle {
        return this.scene.add.rectangle(0, 0, this.width, this.height, 0x0000ff, 0.5);
    }
}
