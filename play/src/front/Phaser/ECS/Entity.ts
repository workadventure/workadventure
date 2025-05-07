import {
    AtLeast,
    EntityData,
    EntityDataProperties,
    EntityDataProperty,
    EntityDescriptionPropertyData,
    EntityPrefab,
    GameMapProperties,
    WAMEntityData,
} from "@workadventure/map-editor";
import merge from "lodash/merge";
import type OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { Unsubscriber, get } from "svelte/store";
import { ActionsMenuAction, actionsMenuStore } from "../../Stores/ActionsMenuStore";
import { mapEditorModeStore } from "../../Stores/MapEditorStore";
import { createColorStore } from "../../Stores/OutlineColorStore";
import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsites } from "../../Stores/CoWebsiteStore";
import { ActivatableInterface } from "../Game/ActivatableInterface";
import { GameScene } from "../Game/GameScene";
import { OutlineableInterface } from "../Game/OutlineableInterface";
import { SpeechDomElement } from "../Entity/SpeechDomElement";

export enum EntityEvent {
    Moved = "EntityEvent:Moved",
    Updated = "EntityEvent:Updated",
    Delete = "EntityEvent:Delete",
    /**
     * Any change done to this Entity properties. Adding new one, deleting or modifying existing one.
     * We send whole array of properties with this event.
     */
    PropertyActivated = "EntityEvent:PropertyActivated",
}

// NOTE: Tiles-based entity for now. Individual images later on
export class Entity extends Phaser.GameObjects.Image implements ActivatableInterface, OutlineableInterface {
    public readonly activationRadius: number = 96;
    private readonly outlineColorStore = createColorStore();
    private readonly outlineColorStoreUnsubscribe: Unsubscriber;

    private entityData: Required<WAMEntityData>;
    private prefab: EntityPrefab;

    private activatable!: boolean;
    private oldPosition: { x: number; y: number };

    private updatePropertyActivableTimeOut: NodeJS.Timeout | undefined;

    private speechDomElement: SpeechDomElement | null = null;

    constructor(scene: GameScene, public readonly entityId: string, data: WAMEntityData, prefab: EntityPrefab) {
        super(scene, data.x, data.y, prefab.imagePath);
        this.setOrigin(0);

        this.oldPosition = this.getPosition();

        this.entityData = {
            ...data,
            name: data.name ?? "",
            properties: data.properties ?? [],
        };
        this.prefab = prefab;

        scene
            .getEntityPermissionsPromise()
            .then(() => {
                this.activatable = this.hasAnyPropertiesSet();
                if (this.activatable) {
                    this.setInteractive({ pixelPerfect: true, cursor: "pointer" });
                    this.scene.input.setDraggable(this);
                }
            })
            .catch((error) => console.error(error));

        this.setDepth(this.y + this.displayHeight + (this.prefab.depthOffset ?? 0));

        this.outlineColorStoreUnsubscribe = this.outlineColorStore.subscribe((color) => {
            this.setOutline(color);
        });

        this.scene.add.existing(this);
        scene.getOutlineManager().add(this, () => {
            return this.getCurrentOutline();
        });
    }

    public get description(): string | undefined {
        const descriptionProperty: EntityDescriptionPropertyData | undefined = this.entityData.properties.find(
            (p) => p.type === "entityDescriptionProperties"
        );
        return descriptionProperty?.description;
    }

    public get searchable(): boolean | undefined {
        const descriptionProperty: EntityDescriptionPropertyData | undefined = this.entityData.properties.find(
            (p) => p.type === "entityDescriptionProperties"
        );
        return descriptionProperty?.searchable;
    }

    public get canEdit(): boolean {
        return (this.scene as GameScene).getEntityPermissions().canEdit(this.getCenter());
    }

    public get canRead(): boolean {
        return (this.scene as GameScene).getEntityPermissions().canRead(this.getCenter());
    }

    /**
     * This method is being used after command execution from outside and it will not trigger any emits
     */
    public updateEntity(dataToModify: Partial<WAMEntityData>): void {
        merge(this.entityData, dataToModify);
        // TODO: Find a way to update it without need of using conditions
        if (dataToModify.properties !== undefined) {
            this.entityData.properties = dataToModify.properties;
        }

        this.setPosition(this.entityData.x, this.entityData.y);
        this.oldPosition = this.getPosition();
        this.activatable = this.hasAnyPropertiesSet();
        if (this.activatable) {
            this.setInteractive({ pixelPerfect: true, cursor: "pointer" });
            this.scene.input.setDraggable(this);
        } else if (!get(mapEditorModeStore)) {
            this.disableInteractive();
        }
    }

    public destroy(): void {
        this.outlineColorStoreUnsubscribe();
        super.destroy();
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public activate(): void {
        if (!this.canEdit && !this.canRead) {
            return;
        }
        if (get(mapEditorModeStore)) {
            actionsMenuStore.clear();
            return;
        }
        this.toggleActionsMenu();
    }

    public deactivate(): void {
        actionsMenuStore.clear();
    }

    public getCollisionGrid(): number[][] | undefined {
        return this.prefab.collisionGrid;
    }

    public getReversedCollisionGrid(): number[][] | undefined {
        return this.prefab.collisionGrid?.map((row) => row.map((value) => (value === 1 ? -1 : value)));
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

    public setEditColor(color: number): void {
        this.outlineColorStore.setEditColor(color);
    }

    public removeEditColor(): void {
        this.outlineColorStore.removeEditColor();
    }

    public setPointedToEditColor(color: number): void {
        this.outlineColorStore.setPointedToEditColor(color);
    }

    public removePointedToEditColor(): void {
        this.outlineColorStore.removePointedToEditColor();
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
        this.emit(EntityEvent.Delete);
    }

    public isActivatable(): boolean {
        return this.activatable;
    }

    public getEntityData(): Required<WAMEntityData> {
        return this.entityData;
    }

    public getPrefab(): EntityPrefab {
        return this.prefab;
    }

    public getProperties(): EntityDataProperties {
        return this.entityData.properties;
    }

    public addProperty(property: EntityDataProperty): void {
        this.entityData.properties.push(property);
        this.emit(EntityEvent.Updated, this.appendId({ properties: this.entityData.properties }));
    }

    public setEntityName(name: string): void {
        this.entityData.name = name;
        this.emit(EntityEvent.Updated, this.appendId({ name }));
    }

    public updateProperty(changes: AtLeast<EntityDataProperty, "id">): void {
        const property = this.entityData.properties.find((property) => property.id === changes.id);
        if (property) {
            merge(property, changes);
        }
        this.emit(EntityEvent.Updated, this.appendId({ properties: this.entityData.properties }));

        // Update activatable status
        if (this.updatePropertyActivableTimeOut) clearTimeout(this.updatePropertyActivableTimeOut);
        this.updatePropertyActivableTimeOut = setTimeout(() => {
            this.activatable = this.hasAnyPropertiesSet();
            if (this.activatable) {
                this.setInteractive({ pixelPerfect: true, cursor: "pointer" });
                this.scene.input.setDraggable(this);
            }
        }, 500);
    }

    public deleteProperty(id: string): boolean {
        const index = this.entityData.properties.findIndex((property) => property.id === id);
        if (index !== -1) {
            this.entityData.properties.splice(index, 1);
            this.emit(EntityEvent.Updated, this.appendId({ properties: this.entityData.properties }));
            return true;
        } else {
            return false;
        }
    }

    public getOldPosition(): { x: number; y: number } {
        return this.oldPosition;
    }

    private getCurrentOutline(): { thickness: number; color?: number } {
        return { thickness: 2, color: get(this.outlineColorStore) };
    }

    private getOutlinePlugin(): OutlinePipelinePlugin | undefined {
        return this.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }

    private hasAnyPropertiesSet(): boolean {
        if (!this.canEdit && !this.canRead) {
            return false;
        }
        if (!this.entityData.properties) {
            return false;
        }
        const propValues = Object.values(this.entityData.properties);
        for (const value of propValues) {
            if (value !== undefined && value !== null) {
                // If the entity has a description property and it's empty, we don't consider it as a property
                if (value.type === "entityDescriptionProperties" && value.description === "") continue;
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
        const description = this.entityData.properties.find((p) => p.type === "entityDescriptionProperties");
        actionsMenuStore.initialize(this.entityData.name ?? "", description?.description);
        for (const action of this.getDefaultActionsMenuActions()) {
            actionsMenuStore.addAction(action);
        }
    }

    private setOutline(color: number | undefined) {
        if (color === undefined) {
            this.getOutlinePlugin()?.remove(this);
        } else {
            this.getOutlinePlugin()?.remove(this);
            this.getOutlinePlugin()?.add(this, {
                thickness: 2,
                outlineColor: color,
            });
        }
        if (this.scene instanceof GameScene) {
            this.scene.refreshSceneForOutline();
        } else {
            throw new Error("Not the Game Scene");
        }
    }

    private getDefaultActionsMenuActions(): ActionsMenuAction[] {
        if (!this.entityData.properties) {
            return [];
        }
        const actions: ActionsMenuAction[] = [];
        const properties = this.entityData.properties;

        for (const property of properties) {
            switch (property.type) {
                case "jitsiRoomProperty": {
                    const roomName = property.roomName;
                    const roomConfig = property.jitsiRoomConfig;
                    actions.push({
                        actionName: property.buttonLabel ?? "",
                        protected: true,
                        priority: 1,
                        callback: () => {
                            this.emit(
                                EntityEvent.PropertyActivated,
                                {
                                    propertyName: GameMapProperties.JITSI_ROOM,
                                    propertyValue: roomName,
                                },
                                {
                                    propertyName: GameMapProperties.JITSI_CONFIG,
                                    propertyValue: JSON.stringify(roomConfig),
                                }
                            );
                            actionsMenuStore.clear();
                        },
                    });
                    break;
                }
                case "openWebsite": {
                    // TODO add description to the empty interaction
                    if (!property.link) break;
                    const link = property.link;
                    const newTab = property.newTab;
                    actions.push({
                        actionName: property.buttonLabel ?? "",
                        protected: true,
                        priority: 1,
                        callback: () => {
                            if (newTab) {
                                this.emit(EntityEvent.PropertyActivated, {
                                    propertyName: GameMapProperties.OPEN_TAB,
                                    propertyValue: link,
                                });
                            } else {
                                const coWebsite = new SimpleCoWebsite(
                                    new URL(link),
                                    property.allowAPI,
                                    property.policy,
                                    property.width,
                                    property.closable
                                );
                                try {
                                    coWebsites.add(coWebsite);
                                } catch (error) {
                                    console.error("Error during loading a co-website: " + coWebsite.getUrl(), error);
                                }
                            }
                            actionsMenuStore.clear();
                        },
                    });
                    break;
                }
                case "playAudio": {
                    const audioLink = property.audioLink;
                    actions.push({
                        actionName: property.buttonLabel ?? "",
                        protected: true,
                        priority: 1,
                        callback: () => {
                            this.emit(EntityEvent.PropertyActivated, {
                                propertyName: GameMapProperties.PLAY_AUDIO,
                                propertyValue: audioLink,
                            });
                            // Fixme: close the menu without impact audio manager and playing
                            //actionsMenuStore.clear();
                        },
                    });
                    break;
                }
            }
        }
        return actions;
    }

    private appendId(data: Partial<WAMEntityData>): Partial<EntityData> {
        return {
            ...data,
            id: this.entityId,
        };
    }

    // Play text on the Image entity
    public playText(id: string, text: string, duration = 10000, callback = () => this.destroyText()) {
        const x = this.x + this.width / 2;
        this.speechDomElement = new SpeechDomElement(id, text, this.scene, x, this.y - 10, callback);
        this.scene.add.existing(this.speechDomElement);
        this.speechDomElement.play(x, this.y - 20, duration);
    }

    // Destroy text
    public destroyText() {
        if (this.speechDomElement) {
            this.speechDomElement.destroy();
            this.speechDomElement = null;
        }
    }
}
