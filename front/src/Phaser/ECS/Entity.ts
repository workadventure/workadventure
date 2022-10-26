import OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { GameScene } from "../Game/GameScene";

export interface EntityConfig {
    image: string;
    collisionGrid?: number[][];
    interactive?: boolean;
    properties?: { [key: string]: unknown | undefined };
}

// NOTE: Tiles-based entity for now. Individual images later on
export class Entity extends Phaser.GameObjects.Image {
    private id: number;
    private collisionGrid?: number[][];

    private outlined: boolean;
    private beingRepositioned: boolean;

    private oldPositionTopLeft: { x: number; y: number };

    constructor(scene: GameScene, x: number, y: number, id: number, config: EntityConfig) {
        super(scene, x, y, config.image);

        this.oldPositionTopLeft = this.getTopLeft();
        this.outlined = false;
        this.beingRepositioned = false;

        this.id = id;
        this.collisionGrid = config.collisionGrid;

        this.setDepth(this.y + this.displayHeight * 0.5);

        if (config.interactive) {
            this.setInteractive({ cursor: "pointer" });
            this.scene.input.setDraggable(this);
        }

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public getCollisionGrid(): number[][] | undefined {
        return this.collisionGrid;
    }

    public getReversedCollisionGrid(): number[][] | undefined {
        return this.collisionGrid?.map((row) => row.map((value) => (value === 1 ? -1 : value)));
    }

    private bindEventHandlers(): void {
        this.on(Phaser.Input.Events.POINTER_OVER, () => {
            if (this.outlined) {
                return;
            }
            this.getOutlinePlugin()?.add(this, {
                thickness: 1,
                outlineColor: 0x0000ff,
            });
            (this.scene as GameScene).markDirty();
            this.outlined = true;
        });

        this.on(Phaser.Input.Events.POINTER_OUT, () => {
            if (!this.outlined) {
                return;
            }
            this.getOutlinePlugin()?.remove(this);
            (this.scene as GameScene).markDirty();
            this.outlined = false;
        });

        this.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            this.x = Math.floor(dragX / 32) * 32;
            this.y = Math.floor(dragY / 32) * 32;
            (this.scene as GameScene).markDirty();
        });

        this.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            this.oldPositionTopLeft = this.getTopLeft();
        });

        this.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            (this.scene as GameScene).markDirty();
            this.emit("moved", this.oldPositionTopLeft.x, this.oldPositionTopLeft.y);
        });
    }

    private getOutlinePlugin(): OutlinePipelinePlugin | undefined {
        return this.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }
}
