import { GameScene } from "../../Game/GameScene";

export enum SizeAlteringSquarePosition {
    TopLeft = 0,
    TopCenter,
    TopRight,
    LeftCenter,
    RightCenter,
    BottomLeft,
    BottomCenter,
    BottomRight,
}

export enum SizeAlteringSquareEvent {
    PositionChanged = "SizeAlteringSquare:PositionChanged",
    Selected = "SizeAlteringSquare:Selected",
    Released = "SizeAlteringSquare:Released",
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
        // NOTE: We use update instead of PointerMove to not loose focus when moving too fast with pointer
        if (this.selected) {
            const newX = this.scene.input.activePointer.worldX - this.parentPos.x;
            const newY = this.scene.input.activePointer.worldY - this.parentPos.y;
            if (this.x !== newX || this.y !== newY) {
                this.x = newX;
                this.y = newY;
                this.emit(SizeAlteringSquareEvent.PositionChanged);
            }
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
        this.scene.input.on(Phaser.Input.Events.POINTER_UP, () => {
            if (this.selected) {
                this.select(false);
                this.emit(SizeAlteringSquareEvent.Released);
            }
        });

        this.on(Phaser.Input.Events.POINTER_DOWN, () => {
            this.select(true);
            this.emit(SizeAlteringSquareEvent.Selected);
        });
    }

    public isSelected(): boolean {
        return this.selected;
    }
}
