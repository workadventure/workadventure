import { ITiledMapRectangleObject } from "@workadventure/map-editor";
import { GameScene } from "../../Game/GameScene";
import { SizeAlteringSquare, SizeAlteringSquareEvent, SizeAlteringSquarePosition } from "./SizeAlteringSquare";

export enum AreaPreviewEvent {
    Clicked = "AreaPreview:Clicked",
    DoubleClicked = "AreaPreview:DoubleClicked",
    Changed = "AreaPreview:Changed",
}

export class AreaPreview extends Phaser.GameObjects.Container {
    private config: ITiledMapRectangleObject;

    private preview: Phaser.GameObjects.Rectangle;
    private squares: SizeAlteringSquare[];

    private selected: boolean;

    constructor(scene: Phaser.Scene, config: ITiledMapRectangleObject) {
        super(scene, 0, 0);

        this.config = config;
        this.selected = false;

        this.preview = this.createPreview(config);
        this.squares = [
            new SizeAlteringSquare(this.scene, this.preview.getTopLeft(), { x: this.x, y: this.y }),
            new SizeAlteringSquare(this.scene, this.preview.getTopCenter(), { x: this.x, y: this.y }),
            new SizeAlteringSquare(this.scene, this.preview.getTopRight(), { x: this.x, y: this.y }),
            new SizeAlteringSquare(this.scene, this.preview.getLeftCenter(), { x: this.x, y: this.y }),
            new SizeAlteringSquare(this.scene, this.preview.getRightCenter(), { x: this.x, y: this.y }),
            new SizeAlteringSquare(this.scene, this.preview.getBottomLeft(), { x: this.x, y: this.y }),
            new SizeAlteringSquare(this.scene, this.preview.getBottomCenter(), { x: this.x, y: this.y }),
            new SizeAlteringSquare(this.scene, this.preview.getBottomRight(), { x: this.x, y: this.y }),
        ];

        this.add([this.preview, ...this.squares]);

        const bounds = this.getBounds();
        this.setSize(bounds.width, bounds.height);

        this.showSizeAlteringSquares(false);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public update(time: number, dt: number): void {
        if (this.selected) {
            this.squares.forEach((square, index) => {
                if (square.isSelected()) {
                    square.update(time, dt);
                }
            });
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
        // this.setPosition(config.x + config.width * 0.5, config.y + config.height * 0.5);
        this.preview.x = config.x + config.width * 0.5;
        this.preview.y = config.y + config.height * 0.5;
        this.preview.displayWidth = config.width;
        this.preview.displayHeight = config.height;
        this.updateSquaresPositions();
    }

    private createPreview(config: ITiledMapRectangleObject): Phaser.GameObjects.Rectangle {
        return this.scene.add
            .rectangle(
                config.x + config.width * 0.5,
                config.y + config.height * 0.5,
                config.width,
                config.height,
                0x0000ff,
                0.5
            )
            .setStrokeStyle(1, 0x000000)
            .setInteractive({ cursor: "pointer" });
    }

    private showSizeAlteringSquares(show = true): void {
        if (show && !this.preview.visible) {
            return;
        }
        this.squares.forEach((square) => square.setVisible(show));
    }

    private bindEventHandlers(): void {
        this.preview.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer) => {
            if ((pointer.event.target as Element)?.localName !== "canvas") {
                return;
            }
            this.emit(AreaPreviewEvent.Clicked);
        });
        this.squares.forEach((square, index) => {
            square.on(SizeAlteringSquareEvent.PositionChanged, () => {
                switch (index) {
                    case SizeAlteringSquarePosition.TopLeft: {
                        this.preview.displayWidth = this.preview.getRightCenter().x - square.x;
                        this.preview.displayHeight = this.preview.getBottomCenter().y - square.y;
                        this.preview.x = square.x + this.preview.displayWidth * 0.5;
                        this.preview.y = square.y + this.preview.displayHeight * 0.5;
                        this.updateSquaresPositions();
                        break;
                    }
                    case SizeAlteringSquarePosition.TopCenter: {
                        this.preview.displayHeight = this.preview.getBottomCenter().y - square.y;
                        this.preview.y = square.y + this.preview.displayHeight * 0.5;
                        this.updateSquaresPositions();
                        break;
                    }
                    case SizeAlteringSquarePosition.TopRight: {
                        break;
                    }
                    case SizeAlteringSquarePosition.LeftCenter: {
                        break;
                    }
                    case SizeAlteringSquarePosition.RightCenter: {
                        break;
                    }
                    case SizeAlteringSquarePosition.BottomLeft: {
                        break;
                    }
                    case SizeAlteringSquarePosition.BottomCenter: {
                        break;
                    }
                    case SizeAlteringSquarePosition.BottomRight: {
                        break;
                    }
                }
                (this.scene as GameScene).markDirty();
            });
            square.on(SizeAlteringSquareEvent.Released, () => {
                this.updateConfigWithSquaresAdjustments();
                this.emit(AreaPreviewEvent.Changed);
            });
        });
    }

    private updateSquaresPositions(): void {
        this.squares[0].setPosition(this.preview.getTopLeft().x, this.preview.getTopLeft().y);
        this.squares[1].setPosition(this.preview.getTopCenter().x, this.preview.getTopCenter().y);
        this.squares[2].setPosition(this.preview.getTopRight().x, this.preview.getTopRight().y);
        this.squares[3].setPosition(this.preview.getLeftCenter().x, this.preview.getLeftCenter().y);
        this.squares[4].setPosition(this.preview.getRightCenter().x, this.preview.getRightCenter().y);
        this.squares[5].setPosition(this.preview.getBottomLeft().x, this.preview.getBottomLeft().y);
        this.squares[6].setPosition(this.preview.getBottomCenter().x, this.preview.getBottomCenter().y);
        this.squares[7].setPosition(this.preview.getBottomRight().x, this.preview.getBottomRight().y);
    }

    private updateConfigWithSquaresAdjustments(): void {
        this.config = {
            ...this.config,
            x: this.preview.x - this.preview.displayWidth * 0.5,
            y: this.preview.y - this.preview.displayHeight * 0.5,
            width: this.preview.displayWidth,
            height: this.preview.displayHeight,
        };
        console.log(this.config);
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
