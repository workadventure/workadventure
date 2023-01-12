import {
    AtLeast,
    EntityData,
    JitsiRoomPropertyData,
    OpenTabPropertyData,
    PlayAudioPropertyData,
    GameMapProperties,
} from "@workadventure/map-editor";
import type OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsiteManager } from "../../WebRtc/CoWebsiteManager";
import { get, Unsubscriber } from "svelte/store";
import { ActionsMenuAction, actionsMenuStore } from "../../Stores/ActionsMenuStore";
import { mapEditorModeStore, MapEntityEditorMode, mapEntityEditorModeStore } from "../../Stores/MapEditorStore";
import { createColorStore } from "../../Stores/OutlineColorStore";
import { ActivatableInterface } from "../Game/ActivatableInterface";
import type { GameScene } from "../Game/GameScene";
import { OutlineableInterface } from "../Game/OutlineableInterface";

import * as _ from "lodash";

export enum EntityEvent {
    Moved = "EntityEvent:Moved",
    Remove = "EntityEvent:Removed",
    PropertiesUpdated = "EntityEvent:PropertiesUpdated",
    PropertyActivated = "EntityEvent:PropertyActivated",
}

// NOTE: Tiles-based entity for now. Individual images later on
export class Entity extends Phaser.GameObjects.Image implements ActivatableInterface, OutlineableInterface {
    public readonly activationRadius: number = 96;
    private readonly outlineColorStore = createColorStore();
    private readonly outlineColorStoreUnsubscribe: Unsubscriber;

    private entityData: Required<EntityData>;

    private activatable: boolean;
    private oldPositionTopLeft: { x: number; y: number };

    constructor(scene: GameScene, data: EntityData) {
        super(scene, data.x, data.y, data.prefab.imagePath);

        this.oldPositionTopLeft = this.getTopLeft();

        this.entityData = {
            ...data,
            properties: data.properties ?? {},
        };

        this.activatable = this.hasAnyPropertiesSet();
        if (this.activatable) {
            this.setInteractive({ pixelPerfect: true, cursor: "pointer" });
            this.scene.input.setDraggable(this);
        }

        this.setDepth(this.y + this.displayHeight * 0.5 + (this.entityData.prefab.depthOffset ?? 0));

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

        this.scene.add.existing(this);
    }

    public updateEntity(dataToModify: AtLeast<EntityData, "id">): void {
        _.merge(this.entityData, dataToModify);

        this.setPosition(this.entityData.x, this.entityData.y);
        this.oldPositionTopLeft = this.getTopLeft();
        this.activatable = this.hasAnyPropertiesSet();
        if (this.activatable) {
            this.setInteractive({ pixelPerfect: true, cursor: "pointer" });
            this.scene.input.setDraggable(this);
        } else if (!get(mapEditorModeStore)) {
            this.disableInteractive();
        }
    }

    public destroy(fromScene?: boolean | undefined): void {
        this.outlineColorStoreUnsubscribe();
        super.destroy();
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public activate(): void {
        if (!(get(mapEditorModeStore) && get(mapEntityEditorModeStore) == MapEntityEditorMode.EditMode)) {
            this.toggleActionsMenu();
        }
    }

    public TestActivation(): void {
        this.toggleActionsMenu();
    }

    public deactivate(): void {
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

    public delete() {
        this.emit(EntityEvent.Remove);
    }

    private getOutlinePlugin(): OutlinePipelinePlugin | undefined {
        return this.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }

    private hasAnyPropertiesSet(): boolean {
        if (!this.entityData.properties) {
            return false;
        }
        const propValues = Object.values(this.entityData.properties);
        for (const value of propValues) {
            if (value !== undefined && value !== null) {
                return true;
            }
        }
        return false;
    }

    private toggleActionsMenu(): void {
        if (get(actionsMenuStore) !== undefined) {
            actionsMenuStore.clear();
            return;
        }
        actionsMenuStore.initialize(this.entityData.properties["textHeader"] ?? "");
        for (const action of this.getDefaultActionsMenuActions()) {
            actionsMenuStore.addAction(action);
        }
    }

    private getDefaultActionsMenuActions(): ActionsMenuAction[] {
        if (!this.entityData.properties) {
            return [];
        }
        const actions: ActionsMenuAction[] = [];
        for (const key of Object.keys(this.entityData.properties)) {
            if (this.entityData.properties[key]) {
                switch (key) {
                    case "textHeader": //do nothing, handled in toggleActionsMenu
                        break;
                    case "jitsiRoom": {
                        const propertyData = this.entityData.properties[key] as JitsiRoomPropertyData;
                        actions.push({
                            actionName: propertyData.buttonLabel,
                            protected: true,
                            priority: 1,
                            callback: () => {
                                this.emit(
                                    EntityEvent.PropertyActivated,
                                    {
                                        propertyName: key,
                                        propertyValue: propertyData.roomName,
                                    },
                                    {
                                        propertyName: GameMapProperties.JITSI_CONFIG,
                                        propertyValue: JSON.stringify(propertyData.jitsiRoomConfig),
                                    }
                                );
                            },
                        });
                        break;
                    }
                    case "playAudio": {
                        const propertyData = this.entityData.properties[key] as PlayAudioPropertyData;
                        actions.push({
                            actionName: propertyData.buttonLabel,
                            protected: true,
                            priority: 1,
                            callback: () => {
                                this.emit(EntityEvent.PropertyActivated, {
                                    propertyName: key,
                                    propertyValue: propertyData.audioLink,
                                });
                            },
                        });
                        break;
                    }
                    case "openTab": {
                        const propertyData = this.entityData.properties[key] as OpenTabPropertyData;
                        actions.push({
                            actionName: propertyData.buttonLabel,
                            protected: true,
                            priority: 1,
                            callback: () => {
                                if (propertyData.inNewTab) {
                                    this.emit(EntityEvent.PropertyActivated, {
                                        propertyName: key,
                                        propertyValue: propertyData.link,
                                    });
                                } else {
                                    const coWebsite = new SimpleCoWebsite(new URL(propertyData.link));
                                    coWebsiteManager.addCoWebsiteToStore(coWebsite, undefined);
                                    coWebsiteManager.loadCoWebsite(coWebsite).catch(() => {
                                        console.error("Error during loading a co-website: " + coWebsite.getUrl());
                                    });
                                }
                            },
                        });
                        break;
                    }
                    default: {
                        break;
                    }
                }
            }
        }
        return actions;
    }

    public isActivatable(): boolean {
        return this.activatable;
    }

    public getEntityData(): Required<EntityData> {
        return this.entityData;
    }

    public getProperties(): { [key: string]: unknown | undefined } {
        return this.entityData.properties;
    }

    public setProperty(key: string, value: unknown): void {
        this.entityData.properties[key] = value;
        this.emit(EntityEvent.PropertiesUpdated, key, value);
    }

    public getOldPositionTopLeft(): { x: number; y: number } {
        return this.oldPositionTopLeft;
    }

    public setOldPositionTopLeft(x: number, y: number): void {
        this.oldPositionTopLeft = { x, y };
    }
}
