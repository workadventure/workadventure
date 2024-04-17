import { EditMapCommandMessage } from "@workadventure/messages";
import debug from "debug";
import { Unsubscriber, get } from "svelte/store";
import { AreaData, AreaDescriptionPropertyData } from "@workadventure/map-editor";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { analyticsClient } from "../../../../Administration/AnalyticsClient";
import {
    mapEditorVisibilityStore,
    mapExplorationAreasStore,
    mapExplorationEntitiesStore,
    mapExplorationModeStore,
    mapExplorationObjectSelectedStore,
} from "../../../../Stores/MapEditorStore";
import { gameManager } from "../../GameManager";
import { GameScene } from "../../GameScene";
import { Entity } from "../../../ECS/Entity";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { EntitiesManager } from "../../GameMap/EntitiesManager";
import { AreaPreview } from "../../../Components/MapEditor/AreaPreview";
import { INITIAL_ZOOM_OUT_EXPLORER_MODE, waScaleManager } from "../../../Services/WaScaleManager";
import { MapEditorTool } from "./MapEditorTool";

const logger = debug("explorer-tool");

export class ExplorerTool implements MapEditorTool {
    private downIsPressed = false;
    private upIsPressed = false;
    private leftIsPressed = false;
    private rightIsPressed = false;
    private explorationMouseIsActive = false;
    private entitiesManager: EntitiesManager;
    private lastCameraCenterXToZoom = 0;
    private lastCameraCenterYToZoom = 0;
    private mapExplorationEntitiesSubscribe: Unsubscriber | undefined;
    private zoomLevelBeforeExplorerMode: number | undefined;

    private keyDownHandler = (event: KeyboardEvent) => {
        if (event.key === "ArrowDown" || event.key === "s") {
            this.downIsPressed = true;
        }
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "z") {
            this.upIsPressed = true;
        }
        if (event.key === "ArrowLeft" || event.key === "q" || event.key === "a") {
            this.leftIsPressed = true;
        }
        if (event.key === "ArrowRight" || event.key === "d") {
            this.rightIsPressed = true;
        }
    };
    private keyUpHandler = (event: KeyboardEvent) => {
        // Define new zone to zoom
        if (this.downIsPressed || this.upIsPressed || this.leftIsPressed || this.rightIsPressed)
            this.doDefineZoomToCenterCameraPosition();
        if (event.key === "ArrowDown" || event.key === "s") {
            this.downIsPressed = false;
        }
        if (event.key === "ArrowUp" || event.key === "w" || event.key === "z") {
            this.upIsPressed = false;
        }
        if (event.key === "ArrowLeft" || event.key === "q" || event.key === "a") {
            this.leftIsPressed = false;
        }
        if (event.key === "ArrowRight" || event.key === "d") {
            this.rightIsPressed = false;
        }
        this.mapEditorModeManager.handleKeyDownEvent(event);
    };
    private wheelHandler = (
        pointer: Phaser.Input.Pointer,
        gameObjects: Phaser.GameObjects.GameObject[],
        deltaX: number,
        deltaY: number,
        deltaZ: number
    ) => {
        // Calculate the velocity of the scroll
        const velocity = deltaY / 53;
        const zoomFactor = 1 - velocity * 0.1;
        // Restore camera mode
        this.scene.zoomByFactor(zoomFactor, velocity);
    };
    private pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
        this.explorationMouseIsActive = true;
        this.scene.input.setDefaultCursor("grabbing");
    };
    private pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
        if (!this.explorationMouseIsActive) return;
        this.scene.cameras.main.scrollX -= pointer.x - pointer.prevPosition.x;
        this.scene.cameras.main.scrollY -= pointer.y - pointer.prevPosition.y;

        // Define new zone to zoom
        this.doDefineZoomToCenterCameraPosition();

        this.scene.markDirty();
    };
    private pointerUpHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
        this.scene.input.setDefaultCursor("grab");
        this.explorationMouseIsActive = false;

        if (gameObjects.length > 0) {
            const gameObject = gameObjects[0];
            if (gameObject instanceof Entity || gameObject instanceof AreaPreview)
                mapExplorationObjectSelectedStore.set(gameObject);
        }

        this.scene.markDirty();
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

    constructor(private mapEditorModeManager: MapEditorModeManager, private readonly scene: GameScene) {
        this.entitiesManager = this.scene.getGameMapFrontWrapper().getEntitiesManager();
    }

    public update(time: number, dt: number): void {
        const factorToMove = 10 * (1 / waScaleManager.zoomModifier);
        if (this.downIsPressed) {
            this.scene.cameras.main.scrollY += factorToMove;
        }
        if (this.upIsPressed) {
            this.scene.cameras.main.scrollY -= factorToMove;
        }
        if (this.leftIsPressed) {
            this.scene.cameras.main.scrollX -= factorToMove;
        }
        if (this.rightIsPressed) {
            this.scene.cameras.main.scrollX += factorToMove;
        }

        get(mapExplorationAreasStore)?.forEach((preview) => preview.update(time, dt));

        // Dirty the scene to update the camera position if it has changed
        if (this.downIsPressed || this.upIsPressed || this.leftIsPressed || this.rightIsPressed) this.scene.markDirty();
    }

    public clear(): void {
        // Put analytics for exploration mode
        analyticsClient.closeExplorationMode();

        // Restore controls of the scene
        this.scene.userInputManager.restoreControls();

        // Remove all controls for the exploration mode
        this.scene.input.keyboard?.off("keydown", this.keyDownHandler);
        this.scene.input.keyboard?.off("keyup", this.keyUpHandler);
        this.scene.input.off("wheel", this.wheelHandler);
        this.scene.input.off("pointerdown", this.pointerDownHandler);
        this.scene.input.off("pointermove", this.pointerMoveHandler);
        this.scene.input.off("pointerup", this.pointerUpHandler);
        this.scene.input.off(Phaser.Input.Events.GAME_OUT, this.pointerUpHandler);

        // Restore focus target
        waScaleManager.setFocusTarget(undefined);
        // Restore camera mode
        this.scene
            .getCameraManager()
            .startFollowPlayer(this.scene.CurrentPlayer, 1000, this.zoomLevelBeforeExplorerMode);

        // Restore entities
        this.entitiesManager.removeAllEntitiesPointedToEditColor();
        this.removeAllAreasPreviewPointedToEditColor();

        // Restore cursor
        this.scene.input.setDefaultCursor("auto");

        // Restore zoom factor
        if (waScaleManager.zoomModifier < INITIAL_ZOOM_OUT_EXPLORER_MODE) this.scene.zoomByFactor(3);

        // Define initial zoom max
        waScaleManager.maxZoomOut = INITIAL_ZOOM_OUT_EXPLORER_MODE;

        // Mark the scene as dirty
        this.scene.markDirty();

        // Unsubscribe to entities store
        if (this.mapExplorationEntitiesSubscribe) this.mapExplorationEntitiesSubscribe();

        // Disable store of map exploration mode
        mapExplorationObjectSelectedStore.set(undefined);
        mapExplorationModeStore.set(false);
        mapEditorVisibilityStore.set(true);
        mapExplorationAreasStore.set(undefined);
    }
    public activate(): void {
        // Put analytics for exploration mode
        analyticsClient.openExplorationMode();

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

        // Disable controls of the scene
        this.scene.userInputManager.disableControls();

        // Implement all controls for the exploration mode
        this.scene.input.setTopOnly(false);
        this.scene.input.keyboard?.on("keydown", this.keyDownHandler);
        this.scene.input.keyboard?.on("keyup", this.keyUpHandler);
        this.scene.input.on("wheel", this.wheelHandler);
        this.scene.input.on("pointerdown", this.pointerDownHandler);
        this.scene.input.on("pointermove", this.pointerMoveHandler);
        this.scene.input.on("pointerup", this.pointerUpHandler);
        this.scene.input.on(Phaser.Input.Events.GAME_OUT, this.pointerUpHandler);

        // Define new camera mode
        //this.scene.getCameraManager().setExplorationMode();

        this.zoomLevelBeforeExplorerMode = waScaleManager.zoomModifier;

        // Make all entities interactive
        this.entitiesManager.makeAllEntitiesInteractive();
        this.entitiesManager.setAllEntitiesPointedToEditColor(0x000000);
        this.setAllAreasPreviewPointedToEditColor();

        this.scene.playSound("audio-cloud");

        // Mark the scene as dirty
        this.scene.markDirty();

        // Define new zone to zoom
        this.defineZoomToCenterCameraPosition();

        // Create flash animation
        this.scene.cameras.main.flash();

        // Use zoom factor to refresh the camera position
        // FIXME: delete this timeout when the camera position will be updated in the same time
        setTimeout(() => {
            this.scene.zoomByFactor(1, 1);
        }, 200);

        // Create subscribe to entities store
        this.mapExplorationEntitiesSubscribe = mapExplorationEntitiesStore.subscribe((entities) => {
            this.entitiesManager.setAllEntitiesPointedToEditColor(0x000000);
            this.scene.markDirty();
        });
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
            gameManager.getCurrentGameScene().getGameMapFrontWrapper().getEntitiesManager().getEntities()
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
                this.pointerOverHandler(areaPreview as AreaPreview);
            });
            areaPreview.on(Phaser.Input.Events.POINTER_OUT, () => {
                this.pointerOutHandler(areaPreview as AreaPreview);
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
        return new AreaPreview(this.scene, structuredClone(areaConfig));
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
}
