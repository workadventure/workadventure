import { GameScene } from "../../Game/GameScene";

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

export class SizeAlteringSquare extends Phaser.GameObjects.Rectangle {
    private selected: boolean;

    private parentPos: { x: number; y: number };

    constructor(scene: Phaser.Scene, pos: { x: number; y: number }, parentPos: { x: number; y: number }) {
        super(scene, pos.x, pos.y, 7, 7, 0xffffff);

        this.parentPos = parentPos;
        this.selected = false;

        this.setStrokeStyle(1, 0x000000);
        this.setInteractive({ cursor: "pointer" });

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public update(time: number, dt: number): void {
        if (this.selected) {
            this.x = this.scene.input.activePointer.worldX - this.parentPos.x;
            this.y = this.scene.input.activePointer.worldY - this.parentPos.y;
            (this.scene as GameScene).markDirty();
        }
    }

    private select(value: boolean): void {
        if (this.selected === value) {
            return;
        }
        this.selected = value;
        this.setFillStyle(value ? 0x000000 : 0xffffff);
        (this.scene as GameScene).markDirty();
    }

    private bindEventHandlers(): void {
        this.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.select(true);
        });
        this.on(Phaser.Input.Events.POINTER_UP, () => {
            this.select(false);
        });
    }
}
