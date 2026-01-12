import type {
    AtLeast,
    EntityData,
    EntityDataProperties,
    EntityDataProperty,
    EntityDescriptionPropertyData,
    EntityPrefab,
    WAMEntityData,
} from "@workadventure/map-editor";
import { GameMapProperties } from "@workadventure/map-editor";
import merge from "lodash/merge";
import type OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type { ActionsMenuAction } from "../../Stores/ActionsMenuStore";
import { actionsMenuStore } from "../../Stores/ActionsMenuStore";
import { mapEditorModeStore } from "../../Stores/MapEditorStore";
import { createColorStore } from "../../Stores/OutlineColorStore";
import { SimpleCoWebsite } from "../../WebRtc/CoWebsite/SimpleCoWebsite";
import { coWebsites } from "../../Stores/CoWebsiteStore";
import type { ActivatableInterface } from "../Game/ActivatableInterface";
import { GameScene } from "../Game/GameScene";
import type { OutlineableInterface } from "../Game/OutlineableInterface";
import { SpeechDomElement } from "../Entity/SpeechDomElement";
import LL from "../../../i18n/i18n-svelte";
import { DEBUG_MODE } from "../../Enum/EnvironmentVariable";

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

export const DEFAULT_ACTIVABLE_RADIUS = 32;

// NOTE: Tiles-based entity for now. Individual images later on
export class Entity extends Phaser.GameObjects.Image implements ActivatableInterface, OutlineableInterface {
    public readonly activationRadius: number = DEFAULT_ACTIVABLE_RADIUS;
    private readonly outlineColorStore = createColorStore();
    private readonly outlineColorStoreUnsubscribe: Unsubscriber;

    private entityData: Required<WAMEntityData>;
    private prefab: EntityPrefab;

    private activatable!: boolean;
    private oldPosition: { x: number; y: number };

    private updatePropertyActivableTimeOut: NodeJS.Timeout | undefined;

    private speechDomElement: SpeechDomElement | null = null;

    private gameScene: GameScene;
    private debugActivationZoneCircle: Phaser.GameObjects.Graphics | null = null;

    constructor(scene: GameScene, public readonly entityId: string, data: WAMEntityData, prefab: EntityPrefab) {
        super(scene, data.x, data.y, prefab.imagePath);
        this.gameScene = scene;
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
                    this.createDebugActivationZone();
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

        // Listen to drag events to update debug activation zone
        this.on(Phaser.Input.Events.DRAG, () => {
            this.updateDebugActivationZone();
        });
    }

    public get description(): string | undefined {
        const descriptionProperty = this.entityData.properties.find(
            (p): p is EntityDescriptionPropertyData => p.type === "entityDescriptionProperties"
        );
        return descriptionProperty?.description;
    }

    public get searchable(): boolean | undefined {
        const descriptionProperty = this.entityData.properties.find(
            (p): p is EntityDescriptionPropertyData => p.type === "entityDescriptionProperties"
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
        const wasActivatable = this.activatable;
        this.activatable = this.hasAnyPropertiesSet();
        if (this.activatable) {
            this.setInteractive({ pixelPerfect: true, cursor: "pointer" });
            this.scene.input.setDraggable(this);
            if (!wasActivatable) {
                this.createDebugActivationZone();
            } else {
                this.updateDebugActivationZone();
            }
        } else {
            if (!get(mapEditorModeStore)) {
                this.disableInteractive();
            }
            this.destroyDebugActivationZone();
        }
    }

    public destroy(): void {
        this.outlineColorStoreUnsubscribe();
        this.destroyDebugActivationZone();
        super.destroy();
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    /**
     * Returns the activation rectangle for this entity.
     * The rectangle is centered on the entity's bounding box and extends by activationRadius on all sides.
     */
    public getActivationRectangle(): { x: number; y: number; width: number; height: number } {
        // Entity position is top-left corner (setOrigin(0))
        const entityRect = {
            x: this.x,
            y: this.y,
            width: this.displayWidth,
            height: this.displayHeight,
        };

        // Expand the rectangle by activationRadius on all sides
        return {
            x: entityRect.x - this.activationRadius,
            y: entityRect.y - this.activationRadius,
            width: entityRect.width + this.activationRadius * 2,
            height: entityRect.height + this.activationRadius * 2,
        };
    }

    /**
     * Returns the collision rectangle for this entity (without activation radius).
     */
    public getCollisionRectangle(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.x,
            y: this.y,
            width: this.displayWidth,
            height: this.displayHeight,
        };
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
            const wasActivatable = this.activatable;
            this.activatable = this.hasAnyPropertiesSet();
            if (this.activatable) {
                this.setInteractive({ pixelPerfect: true, cursor: "pointer" });
                this.scene.input.setDraggable(this);
                if (!wasActivatable) {
                    this.createDebugActivationZone();
                }
            } else {
                this.destroyDebugActivationZone();
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
        const previousActionsMenu = get(actionsMenuStore);
        if (previousActionsMenu !== undefined) {
            actionsMenuStore.clear();
            // If the previous actions menu is for the same entity, don't create a new one
            if (previousActionsMenu.id === this.entityId) return;
        }

        // If there is only one action in the default actions menu, execute it
        const defaultActionsMenu = this.getDefaultActionsMenuActions();
        if (defaultActionsMenu.length === 1) {
            const action = defaultActionsMenu[0].callback();
            if (action instanceof Promise)
                action.catch((error) => console.error("Error during executing the default action: " + error));
            return;
        }

        const description = this.entityData.properties.find(
            (p): p is EntityDescriptionPropertyData => p.type === "entityDescriptionProperties"
        );
        actionsMenuStore.initialize(
            this.entityId,
            this.entityData.name != undefined && this.entityData.name != ""
                ? this.entityData.name
                : this.prefab.name ?? "",
            description?.description,
            this.prefab.imagePath
        );
        for (const action of defaultActionsMenu) {
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
                //TODO: see if we add livekit here
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
                case "openFile": {
                    if (!property.link) break;
                    const newTab = property.newTab;
                    actions.push({
                        actionName: property.buttonLabel ?? "",
                        protected: true,
                        priority: 1,
                        callback: async () => {
                            const answer = await (this.scene as GameScene).connection?.queryMapStorageJwtToken();
                            const link = property.link + (answer && answer.jwt ? `?token=${answer.jwt}` : "");

                            if (newTab) {
                                this.emit(EntityEvent.PropertyActivated, {
                                    propertyName: GameMapProperties.OPEN_TAB,
                                    propertyValue: link,
                                });
                            } else {
                                const coWebsite = new SimpleCoWebsite(
                                    new URL(link),
                                    false, // No need for API in file viewer
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

    // Get action button label from properties
    get actionButtonLabel(): string {
        if (this.entityData.properties.length === 0)
            return get(LL).mapEditor.explorer.details.moveToEntity({ name: "" });
        const property = this.entityData.properties.find((p) => p.type !== "entityDescriptionProperties");
        if (!property) return get(LL).mapEditor.explorer.details.moveToEntity({ name: "" });

        const properties = get(LL).mapEditor.properties;
        let propertyKey = property.type as keyof typeof properties;

        // If the property is an openWebsite and the application is not website, we need to use the application as the property key
        if (propertyKey === "openWebsite" && "application" in property) {
            const openWebsiteProperty = property as { application: string };
            if (openWebsiteProperty.application != "website") {
                propertyKey = openWebsiteProperty.application as keyof typeof properties;
            }
        }

        const propertyTranslation = properties[propertyKey];
        if (
            propertyTranslation != undefined &&
            "actionButtonLabel" in propertyTranslation &&
            typeof (propertyTranslation as { actionButtonLabel?: unknown }).actionButtonLabel === "function"
        ) {
            return (propertyTranslation as { actionButtonLabel: () => string }).actionButtonLabel();
        }
        return get(LL).mapEditor.explorer.details.moveToEntity({ name: "" });
    }

    /**
     * Creates a debug visualization of the activation zone around the entity
     * Only visible when debug mode is enabled in localStorage
     */
    private createDebugActivationZone(): void {
        if (!DEBUG_MODE || !this.activatable) {
            return;
        }

        this.destroyDebugActivationZone();

        this.debugActivationZoneCircle = this.scene.add.graphics();

        // Get rectangles
        const collisionRect = this.getCollisionRectangle();
        const activationRect = this.getActivationRectangle();

        // Draw activation zone rectangle (green)
        this.debugActivationZoneCircle.lineStyle(2, 0x00ff00, 0.8); // Green rectangle with transparency
        this.debugActivationZoneCircle.strokeRect(
            activationRect.x,
            activationRect.y,
            activationRect.width,
            activationRect.height
        );

        // Draw collision rectangle (blue)
        this.debugActivationZoneCircle.lineStyle(2, 0x0000ff, 0.8); // Blue rectangle with transparency
        this.debugActivationZoneCircle.strokeRect(
            collisionRect.x,
            collisionRect.y,
            collisionRect.width,
            collisionRect.height
        );

        // Draw center marker - red cross at the center of the collision rectangle
        const centerX = collisionRect.x + collisionRect.width / 2;
        const centerY = collisionRect.y + collisionRect.height / 2;
        const crossSize = 12;
        const crossThickness = 3;
        this.debugActivationZoneCircle.lineStyle(crossThickness, 0xff0000, 1.0); // Red cross, fully opaque
        // Horizontal line
        this.debugActivationZoneCircle.lineBetween(centerX - crossSize, centerY, centerX + crossSize, centerY);
        // Vertical line
        this.debugActivationZoneCircle.lineBetween(centerX, centerY - crossSize, centerX, centerY + crossSize);

        // Draw small filled circle at center for better visibility
        const centerMarkerRadius = 3;
        this.debugActivationZoneCircle.fillStyle(0xff0000, 1.0); // Red filled circle
        this.debugActivationZoneCircle.fillCircle(centerX, centerY, centerMarkerRadius);

        // Set depth above the entity so the visualization is visible
        this.debugActivationZoneCircle.setDepth(this.depth + 1000); // Render above the entity
        this.debugActivationZoneCircle.setScrollFactor(this.scrollFactorX, this.scrollFactorY);
    }

    /**
     * Updates the position of the debug activation zone visualization
     */
    private updateDebugActivationZone(): void {
        if (!DEBUG_MODE || !this.debugActivationZoneCircle || !this.activatable) {
            return;
        }

        this.debugActivationZoneCircle.clear();

        // Get rectangles
        const collisionRect = this.getCollisionRectangle();
        const activationRect = this.getActivationRectangle();

        // Draw activation zone rectangle (green)
        this.debugActivationZoneCircle.lineStyle(2, 0x00ff00, 0.8); // Green rectangle with transparency
        this.debugActivationZoneCircle.strokeRect(
            activationRect.x,
            activationRect.y,
            activationRect.width,
            activationRect.height
        );

        // Draw collision rectangle (blue)
        this.debugActivationZoneCircle.lineStyle(2, 0x0000ff, 0.8); // Blue rectangle with transparency
        this.debugActivationZoneCircle.strokeRect(
            collisionRect.x,
            collisionRect.y,
            collisionRect.width,
            collisionRect.height
        );

        // Draw center marker - red cross at the center of the collision rectangle
        const centerX = collisionRect.x + collisionRect.width / 2;
        const centerY = collisionRect.y + collisionRect.height / 2;
        const crossSize = 12;
        const crossThickness = 3;
        this.debugActivationZoneCircle.lineStyle(crossThickness, 0xff0000, 1.0); // Red cross, fully opaque
        // Horizontal line
        this.debugActivationZoneCircle.lineBetween(centerX - crossSize, centerY, centerX + crossSize, centerY);
        // Vertical line
        this.debugActivationZoneCircle.lineBetween(centerX, centerY - crossSize, centerX, centerY + crossSize);

        // Draw small filled circle at center for better visibility
        const centerMarkerRadius = 3;
        this.debugActivationZoneCircle.fillStyle(0xff0000, 1.0); // Red filled circle
        this.debugActivationZoneCircle.fillCircle(centerX, centerY, centerMarkerRadius);

        // Set depth above the entity so the visualization is visible
        this.debugActivationZoneCircle.setDepth(this.depth + 1000); // Ensure it stays above the entity
    }

    /**
     * Destroys the debug activation zone circle
     */
    private destroyDebugActivationZone(): void {
        if (this.debugActivationZoneCircle) {
            this.debugActivationZoneCircle.destroy();
            this.debugActivationZoneCircle = null;
        }
    }
}
