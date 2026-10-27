import * as Phaser from "phaser";
import type { EditMapCommandMessage } from "@workadventure/messages";
import debug from "debug";
import type { Unsubscriber } from "svelte/store";
import { get } from "svelte/store";
import type { AreaData, AreaDescriptionPropertyData } from "@workadventure/map-editor";
import type { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { analyticsClient } from "../../../../Administration/AnalyticsClient";
import {
    mapEditorVisibilityStore,
    mapExplorationAreasStore,
    mapExplorationEntitiesStore,
    mapExplorationModeStore,
    mapExplorationObjectSelectedStore,
} from "../../../../Stores/MapEditorStore";
import { gameManager } from "../../GameManager";
import type { GameScene } from "../../GameScene";
import { Entity } from "../../../ECS/Entity";
import type { EntitiesManager } from "../../GameMap/EntitiesManager";
import { AreaPreview } from "../../../Components/MapEditor/AreaPreview";
import { waScaleManager } from "../../../Services/WaScaleManager";
import { mapDragThreshold } from "../../../UserInput/MapDragGesture";
import type { MapEditorTool } from "./MapEditorTool";

import Pointer = Phaser.Input.Pointer;
import GameObject = Phaser.GameObjects.GameObject;

const logger = debug("explorer-tool");

export class ExplorerTool implements MapEditorTool {
    private entitiesManager: EntitiesManager;
    private lastCameraCenterXToZoom = 0;
    private lastCameraCenterYToZoom = 0;
    private mapExplorationEntitiesSubscribe: Unsubscriber | undefined;
    /** Whether activate() has run. clear() is a no-op until it has — see clear(). */
    private activated = false;

    // Dragging, the wheel and the move keys are shared with the rest of the map editor (GameSceneUserInputHandler,
    // CameraManager). The explorer only adds its lists, hover outlines and click-to-select.
    private pointerUpHandler = (pointer: Pointer, gameObjects: GameObject[]) => {
        if (pointer.getDistance() >= mapDragThreshold(pointer)) return;
        const gameObject = gameObjects[0];
        if (gameObject instanceof Entity || gameObject instanceof AreaPreview) {
            mapExplorationObjectSelectedStore.set(gameObject);
            this.scene.markDirty();
        }
    };

    private pointerOverHandler = (gameObject: AreaPreview) => {
        if (gameObject.strokeColor === 0xf9e82d) return;
        gameObject.setStrokeStyle(2, 0xf9e82d);
        this.scene.markDirty();
    };
    private pointerOutHandler = (gameObject: AreaPreview) => {
        if (gameObject.strokeColor === 0x000000) return;
        gameObject.setStrokeStyle(2, 0x000000);
        this.scene.markDirty();
    };

    constructor(private readonly scene: GameScene) {
        this.entitiesManager = this.scene.getGameMapFrontWrapper().getEntitiesManager();
    }

    public update(time: number, dt: number): void {
        get(mapExplorationAreasStore)?.forEach((preview) => preview.update(time, dt));
    }

    public clear(): void {
        // A tool that was never activated has nothing to clear, and reporting that it
        // closed is how every scene teardown recorded an exploration nobody started:
        // MapEditorModeManager builds all its tools up front and destroys all of them
        // (destroy() -> clear()), so this ran even for a user who never opened the
        // explorer.
        if (!this.activated) {
            return;
        }
        this.activated = false;

        // Put analytics for exploration mode
        analyticsClient.trackAdminEvent("map_explorer.closed");

        this.scene.input.off("pointerup", this.pointerUpHandler);

        // Restore focus target
        waScaleManager.setFocusTarget(undefined);

        // Leaving the map editor brings the camera back to the avatar (CameraManager); switching tools keeps the view.

        // Make all entities non interactive
        this.setAllEntitiesNotInteractive();
        // Restore entities
        this.removeAllAreasPreviewPointedToEditColor();

        // Restore cursor
        this.scene.input.setDefaultCursor("auto");

        // Restore zoom factor
        //if (waScaleManager.zoomModifier < INITIAL_ZOOM_OUT_EXPLORER_MODE) this.scene.zoomByFactor(3);

        // Define initial zoom max
        //waScaleManager.maxZoomOut = INITIAL_ZOOM_OUT_EXPLORER_MODE;

        // Mark the scene as dirty
        this.scene.markDirty();

        // Unsubscribe to entities store
        if (this.mapExplorationEntitiesSubscribe) this.mapExplorationEntitiesSubscribe();

        // Disable store of map exploration mode
        mapExplorationObjectSelectedStore.set(undefined);
        mapExplorationModeStore.set(false);
        mapExplorationAreasStore.set(undefined);
    }
    public activate(): void {
        this.activated = true;

        // Put analytics for exploration mode
        analyticsClient.trackAdminEvent("map_explorer.opened");

        // Active store of map exploration mode
        mapExplorationModeStore.set(true);
        mapEditorVisibilityStore.set(true);

        const entitySearchableMap = new Map<string, Entity>();
        gameManager
            .getCurrentGameScene()
            .getGameMapFrontWrapper()
            .getEntitiesManager()
            .getEntities()
            .forEach((entity, key) => {
                if (entity.searchable) {
                    entitySearchableMap.set(key, entity);
                }
            });
        mapExplorationEntitiesStore.set(entitySearchableMap);

        // Define new cursor
        this.scene.input.setDefaultCursor("grab");

        this.scene.input.setTopOnly(false);
        this.scene.input.on("pointerup", this.pointerUpHandler);

        // Make all entities interactive
        this.setAllEntitiesInteractive();
        this.setAllAreasPreviewPointedToEditColor();

        this.scene.playSound("audio-cloud");

        // Mark the scene as dirty
        this.scene.markDirty();
    }
    public destroy(): void {
        this.clear();
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        logger("subscribeToGameMapFrontWrapperEvents => Method not implemented.");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        logger("handleKeyDownEvent => Method not implemented.");
    }
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): Promise<void> {
        // Refresh the entities store
        mapExplorationEntitiesStore.set(
            gameManager.getCurrentGameScene().getGameMapFrontWrapper().getEntitiesManager().getEntities(),
        );
        return Promise.resolve();
    }

    private setAllAreasPreviewPointedToEditColor() {
        const areaConfigs = this.scene.getGameMapFrontWrapper().getAreas();
        const areaPreviews = get(mapExplorationAreasStore) ?? new Map<string, AreaPreview>();
        if (!areaConfigs) return;
        for (const [key, config] of areaConfigs.entries()) {
            if (
                !(config.properties.find((p) => p.type === "areaDescriptionProperties") as AreaDescriptionPropertyData)
                    ?.searchable
            )
                continue;
            let areaPreview = areaPreviews.get(key);
            if (areaPreview) {
                areaPreview.updatePreview(config);
            } else {
                areaPreview = this.createAndSaveAreaPreview(config);
            }
            areaPreview.on(Phaser.Input.Events.POINTER_OVER, () => {
                this.pointerOverHandler(areaPreview);
            });
            areaPreview.on(Phaser.Input.Events.POINTER_OUT, () => {
                this.pointerOutHandler(areaPreview);
            });
            areaPreviews.set(key, areaPreview);

            // Set the initial stroke color to edit color
            areaPreview.setStrokeStyle(2, 0x000000);
        }
        mapExplorationAreasStore.set(areaPreviews);
    }

    private removeAllAreasPreviewPointedToEditColor() {
        const areas = get(mapExplorationAreasStore);
        if (!areas) return;
        for (const [key, area] of areas.entries()) {
            area.setVisible(false);
            area.destroy();
            areas.delete(key);
        }
        areas.clear();
    }

    private createAndSaveAreaPreview(areaConfig: AreaData): AreaPreview {
        // Like trash tool, area previews must override depth to be always on top. The area previews has opacity that permits to see underneath.
        return new AreaPreview(this.scene, structuredClone(areaConfig), true);
    }

    private defineZoomToCenterCameraPositionTimeOut?: NodeJS.Timeout;
    public defineZoomToCenterCameraPosition() {
        if (this.defineZoomToCenterCameraPositionTimeOut) clearTimeout(this.defineZoomToCenterCameraPositionTimeOut);
        // FIXME from the svelte component, the update isn't dispatch in totally at the same time after to move the camera
        this.defineZoomToCenterCameraPositionTimeOut = setTimeout(() => {
            this.doDefineZoomToCenterCameraPosition();
            this.defineZoomToCenterCameraPositionTimeOut = undefined;
        }, 0);
    }

    private doDefineZoomToCenterCameraPosition() {
        const cameraCenterXToZoom = this.scene.cameras.main.worldView.x + this.scene.cameras.main.worldView.width / 2;
        const cameraCenterYToZoom = this.scene.cameras.main.worldView.y + this.scene.cameras.main.worldView.height / 2;
        if (
            cameraCenterXToZoom != this.lastCameraCenterXToZoom ||
            cameraCenterYToZoom != this.lastCameraCenterYToZoom
        ) {
            waScaleManager.setFocusTarget({ x: cameraCenterXToZoom, y: cameraCenterYToZoom });
            this.lastCameraCenterXToZoom = cameraCenterXToZoom;
            this.lastCameraCenterYToZoom = cameraCenterYToZoom;
        }
    }

    private definePointerOutForEntity(entity: Entity) {
        // If the entity is selected, keep the active yellow color
        if (get(mapExplorationObjectSelectedStore) == entity) {
            entity.setPointedToEditColor(0xf9e82d);
        } else {
            entity.setPointedToEditColor(0x00000);
        }
        this.scene.markDirty();
    }

    private setAllEntitiesInteractive() {
        this.entitiesManager.makeAllEntitiesInteractive();
        this.entitiesManager.getEntities().forEach((entity) => {
            if (entity.searchable) {
                entity.setPointedToEditColor(0x00000);
                entity.on(Phaser.Input.Events.POINTER_OUT, () => this.definePointerOutForEntity(entity));
            }
        });
    }

    private setAllEntitiesNotInteractive() {
        this.entitiesManager.getEntities().forEach((entity) => {
            if (entity.searchable) {
                entity.removePointedToEditColor();
                entity.off(Phaser.Input.Events.POINTER_OUT, () => this.definePointerOutForEntity(entity));
            }
        });
        this.entitiesManager.makeAllEntitiesNonInteractive();
    }
}
