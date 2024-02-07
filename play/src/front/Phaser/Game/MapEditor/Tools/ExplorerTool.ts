import { EditMapCommandMessage } from "@workadventure/messages";
import debug from "debug";
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
import { MapEditorTool } from "./MapEditorTool";
import { Entity } from "../../../ECS/Entity";
import { Unsubscriber, get } from "svelte/store";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { EntitiesManager } from "../../GameMap/EntitiesManager";
import { AreaPreview, AreaPreviewEvent } from "../../../Components/MapEditor/AreaPreview";
import { AreaData } from "@workadventure/map-editor";

const logger = debug("explorer-tool");

export class ExplorerTool implements MapEditorTool {
    private scene: GameScene;
    private downIsPressed = false;
    private upIsPressed = false;
    private leftIsPressed = false;
    private rightIsPressed = false;
    private explorationMouseIsActive = false;
    private entitiesManager: EntitiesManager;
    private areaPreviews = new Map<string, AreaPreview>(new Map());
    private mapExplorationEntitiesSubscribe: Unsubscriber | undefined;

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
        this.scene.zoomByFactor(1 - (deltaY / 53) * 0.1);
    };
    private pointerDownHandler = (pointer: Phaser.Input.Pointer) => {
        this.explorationMouseIsActive = true;
        this.scene.input.setDefaultCursor("grabbing");
    };
    private pointerMoveHandler = (pointer: Phaser.Input.Pointer) => {
        if (!this.explorationMouseIsActive) return;
        this.scene.cameras.main.scrollX -= pointer.velocity.x / 10;
        this.scene.cameras.main.scrollY -= pointer.velocity.y / 10;
        this.scene.markDirty();
    };
    private pointerUpHandler = (pointer: Phaser.Input.Pointer, gameObjects: Phaser.GameObjects.GameObject[]) => {
        this.scene.input.setDefaultCursor("grab");
        this.explorationMouseIsActive = false;

        if (gameObjects.length > 0) {
            const gameObject = gameObjects[0];
            console.log('gameObject', gameObject);
            if (gameObject instanceof Entity || gameObject instanceof AreaPreview) mapExplorationObjectSelectedStore.set(gameObject);
        }

        this.scene.markDirty();
    };

    constructor(private mapEditorModeManager: MapEditorModeManager) {
        this.scene = gameManager.getCurrentGameScene();
        this.entitiesManager = this.scene.getGameMapFrontWrapper().getEntitiesManager();
    }

    public update(time: number, dt: number): void {
        if (this.downIsPressed) {
            this.scene.cameras.main.scrollY += 10;
        }
        if (this.upIsPressed) {
            this.scene.cameras.main.scrollY -= 10;
        }
        if (this.leftIsPressed) {
            this.scene.cameras.main.scrollX -= 10;
        }
        if (this.rightIsPressed) {
            this.scene.cameras.main.scrollX += 10;
        }
        this.scene.markDirty();
    }
    public clear(): void {
        // Put analytics for exploration mode
        analyticsClient.closeExplorationMode();

        // Restore controls of the scene
        this.scene.userInputManager.restoreControls();

        // Remove all controls for the exploration mode
        this.scene.input.keyboard?.removeListener("keydown", this.keyDownHandler);
        this.scene.input.keyboard?.removeListener("keyup", this.keyUpHandler);
        this.scene.input.removeListener("wheel", this.wheelHandler);
        this.scene.input.removeListener("pointerdown", this.pointerDownHandler);
        this.scene.input.removeListener("pointermove", this.pointerMoveHandler);
        this.scene.input.removeListener("pointerup", this.pointerUpHandler);

        // Restore camera mode
        this.scene.getCameraManager().startFollowPlayer(this.scene.CurrentPlayer, 1000);

        // Restore entities
        this.entitiesManager.removeAllEntitiesPointedToEditColor();
        this.removeAllAreasPreviewPointedToEditColor();

        // Restore cursor
        this.scene.input.setDefaultCursor("auto");

        // Restore zoom
        this.scene.zoomByFactor(2);

        // Mark the scene as dirty
        this.scene.markDirty();

        // Unsubscribe to entities store
        if (this.mapExplorationEntitiesSubscribe) this.mapExplorationEntitiesSubscribe();

        // Disable store of map exploration mode
        mapExplorationObjectSelectedStore.set(undefined);
        mapExplorationModeStore.set(false);
        mapEditorVisibilityStore.set(true);
    }
    public activate(): void {
        // Put analytics for exploration mode
        analyticsClient.openExplorationMode();

        // Active store of map exploration mode
        mapExplorationModeStore.set(true);
        mapEditorVisibilityStore.set(true);
        mapExplorationEntitiesStore.set(
            gameManager.getCurrentGameScene().getGameMapFrontWrapper().getEntitiesManager().getEntities()
        );
        mapExplorationAreasStore.set(
            gameManager.getCurrentGameScene().getGameMapFrontWrapper().getAreas()
        );

        // Define new cursor
        this.scene.input.setDefaultCursor("grab");

        // Define new zoom
        this.scene.zoomByFactor(0.5);

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

        // Define new camera mode
        this.scene.getCameraManager().setExplorationMode();

        // Make all entities interactive
        this.entitiesManager.makeAllEntitiesInteractive();
        this.entitiesManager.setAllEntitiesPointedToEditColor(0x000000);
        this.setAllAreasPreviewPointedToEditColor();

        // Mark the scene as dirty
        this.scene.markDirty();

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
        if(!areaConfigs)return;
        for (const [key, config] of areaConfigs.entries()) {
            const areaPreview = this.areaPreviews.get(key);
            if (areaPreview) {
                areaPreview.updatePreview(config);
            } else {
                this.createAndSaveAreaPreview(key, config);
            }
        }
    }

    private removeAllAreasPreviewPointedToEditColor() {
        const areas = get(mapExplorationAreasStore);
        if(!areas)return;
        for (const areaKey of areas.keys()) {
            if(!this.areaPreviews.has(areaKey)) continue;
            this.removePreviewEventHandlers(this.areaPreviews.get(areaKey) as AreaPreview);
            this.areaPreviews.clear();
        };
        areas.clear();
        mapExplorationAreasStore.set(undefined);
    }

    private createAndSaveAreaPreview(key: string, areaConfig: AreaData): AreaPreview {
        const areaPreview = new AreaPreview(this.scene, structuredClone(areaConfig));
        this.bindAreaPreviewEventHandlers(areaPreview);
        this.areaPreviews.set(key, areaPreview);
        return areaPreview;
    }

    private bindAreaPreviewEventHandlers(areaPreview: AreaPreview): void {
        //areaPreview.on(AreaPreviewEvent.Clicked, this.pointerUpHandler);
        //areaPreview.on(AreaPreviewEvent.DoubleClicked, this.pointerUpHandler);
    }
    private removePreviewEventHandlers(areaPreview: AreaPreview): void {
        areaPreview.off(AreaPreviewEvent.Clicked, this.pointerUpHandler);
        areaPreview.on(AreaPreviewEvent.DoubleClicked, this.pointerUpHandler);
    }
}
