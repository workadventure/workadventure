import type { AreaData, AreaDataProperties, AtLeast } from "@workadventure/map-editor";
import _ from "lodash";
import { GameScene } from "../../Game/GameScene";
import { SizeAlteringSquare, SizeAlteringSquareEvent, SizeAlteringSquarePosition as Edge } from "./SizeAlteringSquare";

export enum AreaPreviewEvent {
    Clicked = "AreaPreview:Clicked",
    Released = "AreaPreview:Released",
    DoubleClicked = "AreaPreview:DoubleClicked",
    Update = "AreaPreview:Update",
    Delete = "AreaPreview:Delete",
}

export class AreaPreview extends Phaser.GameObjects.Rectangle {
    private squares: SizeAlteringSquare[];

    private areaData: AreaData;
    private selected: boolean;
    private moved: boolean;
    private squareSelected: boolean;

    private shiftKey: Phaser.Input.Keyboard.Key;

    constructor(scene: Phaser.Scene, areaData: AreaData, shiftKey: Phaser.Input.Keyboard.Key) {
        super(
            scene,
            areaData.x + areaData.width * 0.5,
            areaData.y + areaData.height * 0.5,
            areaData.width,
            areaData.height,
            0x0000ff,
            0.5
        );

        this.shiftKey = shiftKey;

        this.areaData = areaData;
        this.selected = false;
        this.moved = false;
        this.squareSelected = false;

        this.squares = [
            new SizeAlteringSquare(this.scene, this.getTopLeft()),
            new SizeAlteringSquare(this.scene, this.getTopCenter()),
            new SizeAlteringSquare(this.scene, this.getTopRight()),
            new SizeAlteringSquare(this.scene, this.getLeftCenter()),
            new SizeAlteringSquare(this.scene, this.getRightCenter()),
            new SizeAlteringSquare(this.scene, this.getBottomLeft()),
            new SizeAlteringSquare(this.scene, this.getBottomCenter()),
            new SizeAlteringSquare(this.scene, this.getBottomRight()),
        ];

        this.squares.forEach((square) => square.setDepth(this.depth + 1));

        const bounds = this.getBounds();
        this.setSize(bounds.width, bounds.height);
        this.setInteractive({ cursor: "pointer" });
        this.scene.input.setDraggable(this);

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

    public delete(): void {
        this.emit(AreaPreviewEvent.Delete);
    }

    public select(value: boolean): void {
        if (this.selected === value) {
            return;
        }
        this.selected = value;
        this.showSizeAlteringSquares(value);
    }

    public setVisible(value: boolean): this {
        this.visible = value;
        if (!value) {
            this.showSizeAlteringSquares(false);
        }
        return this;
    }

    public updatePreview(dataToModify: AtLeast<AreaData, "id">): void {
        _.merge(this.areaData, dataToModify);
        this.x = this.areaData.x + this.areaData.width * 0.5;
        this.y = this.areaData.y + this.areaData.height * 0.5;
        this.displayWidth = this.areaData.width;
        this.displayHeight = this.areaData.height;
        this.updateSquaresPositions();
    }

    public getSize(): number {
        return this.displayWidth * this.displayHeight;
    }

    public setProperty<K extends keyof AreaDataProperties>(key: K, value: AreaDataProperties[K]): void {
        this.areaData.properties[key] = value;
        const data: AtLeast<AreaData, "id"> = {
            id: this.getAreaData().id,
            properties: { [key]: value },
        };
        this.emit(AreaPreviewEvent.Update, data);
    }

    public destroy(): void {
        super.destroy();
        this.squares.forEach((square) => square.destroy());
    }

    public updateAreaData(dataToChange: Partial<AreaData>): void {
        const data = { id: this.areaData.id, ...dataToChange };
        this.updatePreview(data);
        this.emit(AreaPreviewEvent.Update, data);
    }

    private showSizeAlteringSquares(show = true): void {
        if (show && !this.visible) {
            return;
        }
        this.squares.forEach((square) => square.setVisible(show));
    }

    private bindEventHandlers(): void {
        this.on(
            Phaser.Input.Events.POINTER_DOWN,
            (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
                if ((pointer.event.target as Element)?.localName !== "canvas") {
                    return;
                }
                this.emit(AreaPreviewEvent.Clicked);
            }
        );
        this.on(
            Phaser.Input.Events.POINTER_UP,
            (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
                if ((pointer.event.target as Element)?.localName !== "canvas") {
                    return;
                }
                this.emit(AreaPreviewEvent.Released);
            }
        );
        this.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (pointer.isDown && this.selected && !this.squareSelected) {
                if (this.shiftKey.isDown) {
                    const topLeftX = Math.floor((dragX - this.displayWidth * 0.5) / 32) * 32;
                    const topLeftY = Math.floor((dragY - this.displayHeight * 0.5) / 32) * 32;
                    this.x = topLeftX + this.displayWidth * 0.5;
                    this.y = topLeftY + this.displayHeight * 0.5;
                } else {
                    this.x = dragX;
                    this.y = dragY;
                }
                this.updateSquaresPositions();
                this.moved = true;
                if (this.scene instanceof GameScene) {
                    this.scene.markDirty();
                } else {
                    throw new Error("Not the Game Scene");
                }
            }
        });
        this.on(Phaser.Input.Events.POINTER_UP, (pointer: Phaser.Input.Pointer) => {
            if (this.selected && this.moved) {
                this.moved = false;
                this.updateAreaDataWithSquaresAdjustments();
                const data: AtLeast<AreaData, "id"> = {
                    id: this.getAreaData().id,
                    x: this.x - this.displayWidth * 0.5,
                    y: this.y - this.displayHeight * 0.5,
                    width: this.displayWidth,
                    height: this.displayHeight,
                };
                this.emit(AreaPreviewEvent.Update, data);
            }
        });
        this.squares.forEach((square, index) => {
            square.on(SizeAlteringSquareEvent.Selected, () => {
                this.squareSelected = true;
            });

            square.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
                const oldX = square.x;
                const oldY = square.y;

                if (this.shiftKey.isDown) {
                    square.x = Math.floor(dragX / 32) * 32;
                    square.y = Math.floor(dragY / 32) * 32;
                } else {
                    square.x = dragX;
                    square.y = dragY;
                }

                let newWidth = 0;
                let newHeight = 0;
                let newCenterX = 0;
                let newCenterY = 0;

                if ([Edge.RightCenter, Edge.LeftCenter, Edge.TopCenter, Edge.BottomCenter].includes(index)) {
                    const newWidth = this.squares[Edge.RightCenter].x - this.squares[Edge.LeftCenter].x;
                    const newHeight = this.squares[Edge.BottomCenter].y - this.squares[Edge.TopCenter].y;

                    if (newWidth >= 10) {
                        this.displayWidth = newWidth;
                        this.x = this.squares[Edge.LeftCenter].x + this.displayWidth * 0.5;
                    } else {
                        square.x = oldX;
                    }
                    if (newHeight >= 10) {
                        this.displayHeight = newHeight;
                        this.y = this.squares[Edge.TopCenter].y + this.displayHeight * 0.5;
                    } else {
                        square.y = oldY;
                    }
                } else {
                    switch (index) {
                        case Edge.TopLeft: {
                            newWidth = this.getRightCenter().x - square.x;
                            newHeight = this.getBottomCenter().y - square.y;
                            newCenterX = square.x + newWidth * 0.5;
                            newCenterY = square.y + newHeight * 0.5;
                            break;
                        }
                        case Edge.TopRight: {
                            newWidth = square.x - this.getLeftCenter().x;
                            newHeight = this.getBottomCenter().y - square.y;
                            newCenterX = square.x - newWidth * 0.5;
                            newCenterY = square.y + newHeight * 0.5;
                            break;
                        }
                        case Edge.BottomLeft: {
                            newWidth = this.getRightCenter().x - square.x;
                            newHeight = square.y - this.getTopCenter().y;
                            newCenterX = square.x + newWidth * 0.5;
                            newCenterY = square.y - newHeight * 0.5;
                            break;
                        }
                        case Edge.BottomRight: {
                            newWidth = square.x - this.getLeftCenter().x;
                            newHeight = square.y - this.getTopCenter().y;
                            newCenterX = square.x - newWidth * 0.5;
                            newCenterY = square.y - newHeight * 0.5;
                            break;
                        }
                    }
                }

                if (newWidth >= 10) {
                    this.displayWidth = newWidth;
                    this.x = newCenterX;
                } else {
                    square.x = oldX;
                }
                if (newHeight >= 10) {
                    this.displayHeight = newHeight;
                    this.y = newCenterY;
                } else {
                    square.y = oldY;
                }
                this.updateSquaresPositions();
                if (this.scene instanceof GameScene) {
                    this.scene.markDirty();
                } else {
                    throw new Error("Not the Game Scene");
                }
            });

            square.on(SizeAlteringSquareEvent.Released, () => {
                this.squareSelected = false;
                this.updateAreaDataWithSquaresAdjustments();
                const data: AtLeast<AreaData, "id"> = {
                    id: this.getAreaData().id,
                    x: this.x - this.displayWidth * 0.5,
                    y: this.y - this.displayHeight * 0.5,
                    width: this.displayWidth,
                    height: this.displayHeight,
                };
                this.emit(AreaPreviewEvent.Update, data);
            });
        });
    }

    private updateSquaresPositions(): void {
        this.squares[0].setPosition(this.getTopLeft().x, this.getTopLeft().y);
        this.squares[1].setPosition(this.getTopCenter().x, this.getTopCenter().y);
        this.squares[2].setPosition(this.getTopRight().x, this.getTopRight().y);
        this.squares[3].setPosition(this.getLeftCenter().x, this.getLeftCenter().y);
        this.squares[4].setPosition(this.getRightCenter().x, this.getRightCenter().y);
        this.squares[5].setPosition(this.getBottomLeft().x, this.getBottomLeft().y);
        this.squares[6].setPosition(this.getBottomCenter().x, this.getBottomCenter().y);
        this.squares[7].setPosition(this.getBottomRight().x, this.getBottomRight().y);
    }

    private updateAreaDataWithSquaresAdjustments(): void {
        this.areaData = {
            ...this.areaData,
            x: this.x - this.displayWidth * 0.5,
            y: this.y - this.displayHeight * 0.5,
            width: this.displayWidth,
            height: this.displayHeight,
        };
    }

    public getAreaData(): AreaData {
        return this.areaData;
    }

    public getName(): string {
        return this.areaData.name;
    }

    public getId(): string {
        return this.areaData.id;
    }
}
