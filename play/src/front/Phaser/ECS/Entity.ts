import { EntityData } from "@workadventure/map-editor";
import type OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { get, Unsubscriber } from "svelte/store";
import { ActionsMenuAction, actionsMenuStore } from "../../Stores/ActionsMenuStore";
import {
    mapEditorModeStore,
    mapEditorSelectedEntityStore,
    MapEntityEditorMode,
    mapEntityEditorModeStore,
} from "../../Stores/MapEditorStore";
import { createColorStore } from "../../Stores/OutlineColorStore";
import { ActivatableInterface } from "../Game/ActivatableInterface";
import type { GameScene } from "../Game/GameScene";
import { OutlineableInterface } from "../Game/OutlineableInterface";

export enum EntityEvent {
    Moved = "EntityEvent:Moved",
    Removed = "EntityEvent:Removed",
    PropertySet = "EntityEvent:PropertySet",
}

// NOTE: Tiles-based entity for now. Individual images later on
export class Entity extends Phaser.GameObjects.Image implements ActivatableInterface, OutlineableInterface {
    public readonly activationRadius: number = 96;
    private readonly outlineColorStore = createColorStore();
    private readonly outlineColorStoreUnsubscribe: Unsubscriber;

    private entityData: EntityData;
    private properties: { [key: string]: unknown | undefined };

    private beingRepositioned: boolean;
    private activatable: boolean;
    private oldPositionTopLeft: { x: number; y: number };

    constructor(scene: GameScene, data: EntityData) {
        super(scene, data.x, data.y, data.prefab.imagePath);

        this.oldPositionTopLeft = this.getTopLeft();
        this.beingRepositioned = false;

        this.activatable = data.interactive ?? false;

        this.entityData = data;
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
            this.setInteractive({ pixelPerfect: true, cursor: "pointer" });
            this.scene.input.setDraggable(this);
        }

        this.bindEventHandlers();

        this.scene.add.existing(this);
    }

    public destroy(fromScene?: boolean | undefined): void {
        this.outlineColorStoreUnsubscribe();
        this.emit(EntityEvent.Removed);
        super.destroy();
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public activate(): void {
        this.toggleActionsMenu();
    }

    public deactivate(): void {
        console.log("DEACTIVATE");
        actionsMenuStore.clear();
    }

    public getCollisionGrid(): number[][] | undefined {
        return this.entityData.prefab.collisionGrid;
    }

    public getReversedCollisionGrid(): number[][] | undefined {
        return this.entityData.prefab.collisionGrid?.map((row) => row.map((value) => (value === 1 ? -1 : value)));
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
            if (get(mapEditorModeStore) && get(mapEntityEditorModeStore) === MapEntityEditorMode.EditMode) {
                const offsets = this.getPositionOffset(this.entityData.prefab.collisionGrid);
                this.x = this.entityData.prefab.collisionGrid
                    ? Math.floor(dragX / 32) * 32 + offsets.x
                    : Math.floor(dragX);
                this.y = this.entityData.prefab.collisionGrid
                    ? Math.floor(dragY / 32) * 32 + offsets.y
                    : Math.floor(dragY);
                (this.scene as GameScene).markDirty();
            }
        });

        this.on(Phaser.Input.Events.DRAG_START, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore) && get(mapEntityEditorModeStore) === MapEntityEditorMode.EditMode) {
                this.oldPositionTopLeft = this.getTopLeft();
            }
        });

        this.on(Phaser.Input.Events.DRAG_END, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore) && get(mapEntityEditorModeStore) === MapEntityEditorMode.EditMode) {
                (this.scene as GameScene).markDirty();
                this.emit(EntityEvent.Moved, this.oldPositionTopLeft.x, this.oldPositionTopLeft.y);
            }
        });

        this.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer, dragX: number, dragY: number) => {
            if (get(mapEditorModeStore)) {
                const entityEditorMode = get(mapEntityEditorModeStore);
                switch (entityEditorMode) {
                    case MapEntityEditorMode.EditMode: {
                        mapEditorSelectedEntityStore.set(this);
                        break;
                    }
                    case MapEntityEditorMode.RemoveMode: {
                        this.destroy();
                        break;
                    }
                }
            }
        });

        this.on(Phaser.Input.Events.POINTER_OVER, () => {
            if (get(mapEditorModeStore)) {
                const entityEditorMode = get(mapEntityEditorModeStore);
                switch (entityEditorMode) {
                    case MapEntityEditorMode.AddMode: {
                        break;
                    }
                    case MapEntityEditorMode.RemoveMode: {
                        this.setTint(0xff0000);
                        break;
                    }
                    case MapEntityEditorMode.EditMode: {
                        this.setTint(0x3498db);
                        break;
                    }
                }
                (this.scene as GameScene).markDirty();
            }
        });

        this.on(Phaser.Input.Events.POINTER_OUT, () => {
            if (get(mapEditorModeStore)) {
                this.clearTint();
                (this.scene as GameScene).markDirty();
            }
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
        actionsMenuStore.initialize(this.entityData.prefab.name);
        for (const action of this.getDefaultActionsMenuActions()) {
            actionsMenuStore.addAction(action);
        }
    }

    private getDefaultActionsMenuActions(): ActionsMenuAction[] {
        const actions: ActionsMenuAction[] = [];
        for (const key of Object.keys(this.properties)) {
            switch (key) {
                case "jitsiRoom": {
                    actions.push({
                        actionName: "Open Jitsi",
                        protected: true,
                        priority: 1,
                        callback: () => {
                            this.emit(EntityEvent.PropertySet, {
                                propertyName: key,
                                propertyValue: this.properties[key],
                            });
                        },
                    });
                    break;
                }
                case "playAudio": {
                    actions.push({
                        actionName: "Play campfire sound",
                        protected: true,
                        priority: 1,
                        callback: () => {
                            this.emit(EntityEvent.PropertySet, {
                                propertyName: key,
                                propertyValue: this.properties[key],
                            });
                        },
                    });
                    break;
                }
                case "openTab": {
                    actions.push({
                        actionName: "Show me some kitties!",
                        protected: true,
                        priority: 1,
                        callback: () => {
                            this.emit(EntityEvent.PropertySet, {
                                propertyName: key,
                                propertyValue: this.properties[key],
                            });
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

    private getPositionOffset(collisionGrid?: number[][]): { x: number; y: number } {
        if (!collisionGrid || collisionGrid.length === 0) {
            return { x: 0, y: 0 };
        }
        return {
            x: collisionGrid[0].length % 2 === 1 ? 16 : 0,
            y: collisionGrid.length % 2 === 1 ? 16 : 0,
        };
    }

    public isActivatable(): boolean {
        return this.activatable;
    }

    public getEntityData(): EntityData {
        return this.entityData;
    }
}
