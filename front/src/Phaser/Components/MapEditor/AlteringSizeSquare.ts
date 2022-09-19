export enum SizeAlteringSquarePosition {
    TopLeft = "TopLeft",
    TopCenter = "TopCenter",
    TopRight = "TopRight",
    LeftCenter = "LeftCenter",
    RightCenter = "RightCenter",
    BottomLeft = "BottomLeft",
    BottomCenter = "BottomCenter",
    BottomRight = "BottomRight",
}

export class AlteringSizeSquare extends Phaser.GameObjects.Rectangle {
    constructor(scene: Phaser.Scene, position: { x: number; y: number }) {
        super(scene, position.x, position.y, 7, 7, 0xffffff);

        this.setStrokeStyle(1, 0x000000);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    private bindEventHandlers(): void {}
}
