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
        super(scene, config.x + config.width * 0.5, config.y + config.height * 0.5);

        this.config = config;

        this.preview = this.createPreview(config);

        this.add([this.preview]);

        const bounds = this.getBounds();
        this.setSize(bounds.width, bounds.height);

        console.log(config);

        this.scene.add.existing(this);
    }

    private createPreview(config: AreaPreviewConfig): Phaser.GameObjects.Rectangle {
        return this.scene.add.rectangle(0, 0, config.width, config.height, 0x0000ff, 0.5);
    }
}
