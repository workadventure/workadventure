import { ITiledMapRectangleObject } from "@workadventure/map-editor";
import { SizeAlteringSquare, SizeAlteringSquarePosition } from "./SizeAlteringSquare";

export enum AreaPreviewEvent {
    Clicked = "Clicked",
    DoubleClicked = "DoubleClicked",
}

export class AreaPreview extends Phaser.GameObjects.Container {
    private config: ITiledMapRectangleObject;

    private preview: Phaser.GameObjects.Rectangle;
    private squares: Record<SizeAlteringSquarePosition, SizeAlteringSquare>;
    private squaresArray: SizeAlteringSquare[];

    private selected: boolean;

    constructor(scene: Phaser.Scene, config: ITiledMapRectangleObject) {
        super(scene, config.x + config.width * 0.5, config.y + config.height * 0.5);

        this.config = config;
        this.selected = false;

        this.preview = this.createPreview(config);
        this.squares = {
            [SizeAlteringSquarePosition.TopLeft]: new SizeAlteringSquare(this.scene, this.preview.getTopLeft(), {
                x: this.x,
                y: this.y,
            }),
            [SizeAlteringSquarePosition.TopCenter]: new SizeAlteringSquare(this.scene, this.preview.getTopCenter(), {
                x: this.x,
                y: this.y,
            }),
            [SizeAlteringSquarePosition.TopRight]: new SizeAlteringSquare(this.scene, this.preview.getTopRight(), {
                x: this.x,
                y: this.y,
            }),
            [SizeAlteringSquarePosition.LeftCenter]: new SizeAlteringSquare(this.scene, this.preview.getLeftCenter(), {
                x: this.x,
                y: this.y,
            }),
            [SizeAlteringSquarePosition.RightCenter]: new SizeAlteringSquare(
                this.scene,
                this.preview.getRightCenter(),
                { x: this.x, y: this.y }
            ),
            [SizeAlteringSquarePosition.BottomLeft]: new SizeAlteringSquare(this.scene, this.preview.getBottomLeft(), {
                x: this.x,
                y: this.y,
            }),
            [SizeAlteringSquarePosition.BottomCenter]: new SizeAlteringSquare(
                this.scene,
                this.preview.getBottomCenter(),
                { x: this.x, y: this.y }
            ),
            [SizeAlteringSquarePosition.BottomRight]: new SizeAlteringSquare(
                this.scene,
                this.preview.getBottomRight(),
                { x: this.x, y: this.y }
            ),
        };
        this.squaresArray = Object.values(this.squares);

        this.add([this.preview, ...this.squaresArray]);

        const bounds = this.getBounds();
        this.setSize(bounds.width, bounds.height);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public update(time: number, dt: number): void {
        if (this.selected) {
            this.squaresArray.forEach((square) => square.update(time, dt));
        }
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
        this.squaresArray.forEach((square) => square.setVisible(show));
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
