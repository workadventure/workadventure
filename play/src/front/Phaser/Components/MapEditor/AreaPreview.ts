import type { AreaData } from "@workadventure/map-editor";
import type { GameScene } from "../../Game/GameScene";
import { SizeAlteringSquare, SizeAlteringSquareEvent, SizeAlteringSquarePosition as Edge } from "./SizeAlteringSquare";

export enum AreaPreviewEvent {
    Clicked = "AreaPreview:Clicked",
    DoubleClicked = "AreaPreview:DoubleClicked",
    Changed = "AreaPreview:Changed",
}

export class AreaPreview extends Phaser.GameObjects.Container {
    private config: AreaData;

    private preview: Phaser.GameObjects.Rectangle;
    private squares: SizeAlteringSquare[];

    private selected: boolean;
    private moved: boolean;
    private squareSelected: boolean;

    constructor(scene: Phaser.Scene, config: AreaData) {
        super(scene, 0, 0);

        this.config = config;
        this.selected = false;
        this.moved = false;
        this.squareSelected = false;

        this.preview = this.createPreview(config);
        this.squares = [
            new SizeAlteringSquare(this.scene, this.preview.getTopLeft()),
            new SizeAlteringSquare(this.scene, this.preview.getTopCenter()),
            new SizeAlteringSquare(this.scene, this.preview.getTopRight()),
            new SizeAlteringSquare(this.scene, this.preview.getLeftCenter()),
            new SizeAlteringSquare(this.scene, this.preview.getRightCenter()),
            new SizeAlteringSquare(this.scene, this.preview.getBottomLeft()),
            new SizeAlteringSquare(this.scene, this.preview.getBottomCenter()),
            new SizeAlteringSquare(this.scene, this.preview.getBottomRight()),
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

    public updatePreview(config: AreaData): void {
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

    private createPreview(config: AreaData): Phaser.GameObjects.Rectangle {
        const preview = this.scene.add
            .rectangle(
                config.x + config.width * 0.5,
                config.y + config.height * 0.5,
                config.width,
                config.height,
                0x0000ff,
                0.5
            )
            .setInteractive({ cursor: "pointer" });
        this.scene.input.setDraggable(preview);
        return preview;
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
        this.preview.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (pointer.isDown && this.selected && !this.squareSelected) {
                this.preview.x = dragX;
                this.preview.y = dragY;
                this.updateSquaresPositions();
                this.moved = true;
                (this.scene as GameScene).markDirty();
            }
        });
        this.preview.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
            if (this.selected && this.moved) {
                this.moved = false;
                this.updateConfigWithSquaresAdjustments();
                this.emit(AreaPreviewEvent.Changed);
            }
        });
        this.squares.forEach((square, index) => {
            square.on(SizeAlteringSquareEvent.Selected, () => {
                this.squareSelected = true;
            });

            square.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                const oldX = square.x;
                const oldY = square.y;

                square.x = dragX;
                square.y = dragY;

                let newWidth = 0;
                let newHeight = 0;
                let newCenterX = 0;
                let newCenterY = 0;

                if ([Edge.RightCenter, Edge.LeftCenter, Edge.TopCenter, Edge.BottomCenter].includes(index)) {
                    const newWidth = this.squares[Edge.RightCenter].x - this.squares[Edge.LeftCenter].x;
                    const newHeight = this.squares[Edge.BottomCenter].y - this.squares[Edge.TopCenter].y;

                    if (newWidth >= 32) {
                        this.preview.displayWidth = newWidth;
                        this.preview.x = this.squares[Edge.LeftCenter].x + this.preview.displayWidth * 0.5;
                    } else {
                        square.x = oldX;
                    }
                    if (newHeight >= 32) {
                        this.preview.displayHeight = newHeight;
                        this.preview.y = this.squares[Edge.TopCenter].y + this.preview.displayHeight * 0.5;
                    } else {
                        square.y = oldY;
                    }
                } else {
                    switch (index) {
                        case Edge.TopLeft: {
                            newWidth = this.preview.getRightCenter().x - square.x;
                            newHeight = this.preview.getBottomCenter().y - square.y;
                            newCenterX = square.x + newWidth * 0.5;
                            newCenterY = square.y + newHeight * 0.5;
                            break;
                        }
                        case Edge.TopRight: {
                            newWidth = square.x - this.preview.getLeftCenter().x;
                            newHeight = this.preview.getBottomCenter().y - square.y;
                            newCenterX = square.x - newWidth * 0.5;
                            newCenterY = square.y + newHeight * 0.5;
                            break;
                        }
                        case Edge.BottomLeft: {
                            newWidth = this.preview.getRightCenter().x - square.x;
                            newHeight = square.y - this.preview.getTopCenter().y;
                            newCenterX = square.x + newWidth * 0.5;
                            newCenterY = square.y - newHeight * 0.5;
                            break;
                        }
                        case Edge.BottomRight: {
                            newWidth = square.x - this.preview.getLeftCenter().x;
                            newHeight = square.y - this.preview.getTopCenter().y;
                            newCenterX = square.x - newWidth * 0.5;
                            newCenterY = square.y - newHeight * 0.5;
                            break;
                        }
                    }
                }

                if (newWidth >= 32) {
                    this.preview.displayWidth = newWidth;
                    this.preview.x = newCenterX;
                } else {
                    square.x = oldX;
                }
                if (newHeight >= 32) {
                    this.preview.displayHeight = newHeight;
                    this.preview.y = newCenterY;
                } else {
                    square.y = oldY;
                }
                this.updateSquaresPositions();
                (this.scene as GameScene).markDirty();
            });

            square.on(SizeAlteringSquareEvent.Released, () => {
                this.squareSelected = false;
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
    }

    public getConfig(): AreaData {
        return this.config;
    }

    public getName(): string {
        return this.config.name;
    }

    public getId(): string {
        return this.config.id;
    }
}
