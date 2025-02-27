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
    GameScene,
}

export enum SizeAlteringSquareEvent {
    Selected = "SizeAlteringSquare:Selected",
    Released = "SizeAlteringSquare:Released",
}

export class SizeAlteringSquare extends Phaser.GameObjects.Rectangle {
    private selected: boolean;

    constructor(scene: Phaser.Scene, pos: { x: number; y: number }, private cursor: string) {
        super(scene, pos.x, pos.y, 7, 7, 0xffffff);

        this.selected = false;

        this.setStrokeStyle(1, 0x000000);
        this.setInteractive({ cursor });
        this.scene.input.setDraggable(this);

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public update(time: number, dt: number): void {
        // NOTE: We use update instead of PointerMove to not loose focus when moving too fast with pointer
    }

    private select(value: boolean): void {
        if (this.selected === value) {
            return;
        }
        this.selected = value;
        this.setFillStyle(value ? 0x000000 : 0xffffff);
        if (this.scene instanceof GameScene) {
            this.scene.markDirty();
        } else {
            throw new Error("Not the Game Scene");
        }
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
