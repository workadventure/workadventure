import { ITiledMapRectangleObject } from "@workadventure/map-editor";
import { SizeAlteringSquare, SizeAlteringSquarePosition } from "./AlteringSizeSquare";

export enum AreaPreviewEvent {
    Clicked = "Clicked",
    DoubleClicked = "DoubleClicked",
}

export class AreaPreview extends Phaser.GameObjects.Container {
    private config: ITiledMapRectangleObject;

    private preview: Phaser.GameObjects.Rectangle;
    private squares: Record<SizeAlteringSquarePosition, SizeAlteringSquare>;

    private selected: boolean;

    constructor(scene: Phaser.Scene, config: ITiledMapRectangleObject) {
        super(scene, config.x + config.width * 0.5, config.y + config.height * 0.5);

        this.config = config;
        this.selected = false;

        this.preview = this.createPreview(config);
        this.squares = {
            [SizeAlteringSquarePosition.TopLeft]: new SizeAlteringSquare(this.scene, this.preview.getTopLeft()),
            [SizeAlteringSquarePosition.TopCenter]: new SizeAlteringSquare(this.scene, this.preview.getTopCenter()),
            [SizeAlteringSquarePosition.TopRight]: new SizeAlteringSquare(this.scene, this.preview.getTopRight()),
            [SizeAlteringSquarePosition.LeftCenter]: new SizeAlteringSquare(this.scene, this.preview.getLeftCenter()),
            [SizeAlteringSquarePosition.RightCenter]: new SizeAlteringSquare(this.scene, this.preview.getRightCenter()),
            [SizeAlteringSquarePosition.BottomLeft]: new SizeAlteringSquare(this.scene, this.preview.getBottomLeft()),
            [SizeAlteringSquarePosition.BottomCenter]: new SizeAlteringSquare(
                this.scene,
                this.preview.getBottomCenter()
            ),
            [SizeAlteringSquarePosition.BottomRight]: new SizeAlteringSquare(this.scene, this.preview.getBottomRight()),
        };

        this.add([this.preview, ...Object.values(this.squares)]);

        const bounds = this.getBounds();
        this.setSize(bounds.width, bounds.height);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public select(value: boolean): void {
        if (this.selected === value) {
            return;
        }
        this.selected = value;
        this.showSizeAlteringSquares(value);
    }

    public setVisible(value: boolean): this {
        this.preview.setVisible(value);
        if (!value) {
            this.showSizeAlteringSquares(false);
        }
        return this;
    }

    public updatePreview(config: ITiledMapRectangleObject): void {
        this.config = {
            ...this.config,
            ...structuredClone(config),
        };
        this.setPosition(config.x + config.width * 0.5, config.y + config.height * 0.5);
        this.preview.displayWidth = config.width;
        this.preview.displayHeight = config.height;
    }

    private createPreview(config: ITiledMapRectangleObject): Phaser.GameObjects.Rectangle {
        return this.scene.add
            .rectangle(0, 0, config.width, config.height, 0x0000ff, 0.5)
            .setStrokeStyle(1, 0x000000)
            .setInteractive({ cursor: "pointer" });
    }

    private showSizeAlteringSquares(show = true): void {
        if (show && !this.preview.visible) {
            return;
        }
        Object.values(this.squares).forEach((square) => square.setVisible(show));
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
