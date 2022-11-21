import { EntityData } from "@workadventure/map-editor";
import type OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { get, Unsubscriber } from "svelte/store";
import { ActionsMenuAction, actionsMenuStore } from "../../Stores/ActionsMenuStore";
import { mapEditorModeStore } from "../../Stores/MapEditorStore";
import { createColorStore } from "../../Stores/OutlineColorStore";
import { ActivatableInterface } from "../Game/ActivatableInterface";
import type { GameScene } from "../Game/GameScene";
import { OutlineableInterface } from "../Game/OutlineableInterface";

export enum EntityEvent {
    Moved = "Moved",
}

// NOTE: Tiles-based entity for now. Individual images later on
export class Entity extends Phaser.GameObjects.Image implements ActivatableInterface, OutlineableInterface {
    public readonly activationRadius: number = 96;
    private readonly outlineColorStore = createColorStore();
    private readonly outlineColorStoreUnsubscribe: Unsubscriber;

    private id: number;
    private collisionGrid?: number[][];
    private properties: { [key: string]: unknown | undefined };

    private beingRepositioned: boolean;

    private activatable: boolean;

    private oldPositionTopLeft: { x: number; y: number };

    constructor(scene: GameScene, data: EntityData) {
        super(scene, data.x, data.y, data.image);

        this.oldPositionTopLeft = this.getTopLeft();
        this.beingRepositioned = false;

        this.activatable = data.interactive ?? false;

        this.id = data.id;
        this.collisionGrid = data.collisionGrid;
        this.properties = data.properties ?? {};

        this.setDepth(this.y + this.displayHeight * 0.5);

        this.outlineColorStoreUnsubscribe = this.outlineColorStore.subscribe((color) => {
            if (color === undefined) {
                this.getOutlinePlugin()?.remove(this);
            } else {
                this.getOutlinePlugin()?.remove(this);
                this.getOutlinePlugin()?.add(this, {
                    thickness: 2,
                    outlineColor: color,
                });
            }
            (this.scene as GameScene).markDirty();
        });

        if (data.interactive) {
            this.setInteractive({ cursor: "pointer" });
            this.scene.input.setDraggable(this);
        }

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public destroy(fromScene?: boolean | undefined): void {
        this.outlineColorStoreUnsubscribe();
        super.destroy();
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public activate(): void {
        this.toggleActionsMenu();
    }

    public getCollisionGrid(): number[][] | undefined {
        return this.collisionGrid;
    }

    public getReversedCollisionGrid(): number[][] | undefined {
        return this.collisionGrid?.map((row) => row.map((value) => (value === 1 ? -1 : value)));
    }

    public setFollowOutlineColor(color: number): void {
        this.outlineColorStore.setFollowColor(color);
    }

    public removeFollowOutlineColor(): void {
        this.outlineColorStore.removeFollowColor();
    }

    public setApiOutlineColor(color: number): void {
        this.outlineColorStore.setApiColor(color);
    }

    public removeApiOutlineColor(): void {
        this.outlineColorStore.removeApiColor();
    }

    public pointerOverOutline(color: number): void {
        this.outlineColorStore.pointerOver(color);
    }

    public pointerOutOutline(): void {
        this.outlineColorStore.pointerOut();
    }

    public characterCloseByOutline(color: number): void {
        this.outlineColorStore.characterCloseBy(color);
    }

    public characterFarAwayOutline(): void {
        this.outlineColorStore.characterFarAway();
    }

    private bindEventHandlers(): void {
        this.on(Phaser.Input.Events.DRAG, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore)) {
                return;
            }
            this.x = Math.floor(dragX / 32) * 32;
            this.y = Math.floor(dragY / 32) * 32;
            (this.scene as GameScene).markDirty();
        });

        this.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore)) {
                return;
            }
            this.oldPositionTopLeft = this.getTopLeft();
        });

        this.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore)) {
                return;
            }
            (this.scene as GameScene).markDirty();
            this.emit(EntityEvent.Moved, this.oldPositionTopLeft.x, this.oldPositionTopLeft.y);
        });
    }

    private getOutlinePlugin(): OutlinePipelinePlugin | undefined {
        return this.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }

    private toggleActionsMenu(): void {
        if (get(actionsMenuStore) !== undefined) {
            actionsMenuStore.clear();
            return;
        }
        actionsMenuStore.initialize("Cheapest Table you can find");
        for (const action of this.getDefaultActionsMenuActions()) {
            actionsMenuStore.addAction(action);
        }
    }

    private getDefaultActionsMenuActions(): ActionsMenuAction[] {
        const actions: ActionsMenuAction[] = [];
        for (const key of Object.keys(this.properties)) {
            switch (key) {
                case "openWebsite": {
                    actions.push({
                        actionName: "Open Website",
                        protected: true,
                        priority: 1,
                        callback: () => {
                            console.log("TRY TO OPEN WEBSITE");
                            console.log(this.properties[key]);
                        },
                    });
                    break;
                }
                default: {
                    break;
                }
            }
        }
        return actions;
    }

    public isActivatable(): boolean {
        return this.activatable;
    }
}
