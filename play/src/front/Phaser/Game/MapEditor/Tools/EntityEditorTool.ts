import { CommandConfig, EntityPrefab } from "@workadventure/map-editor";
import { EditMapCommandMessage } from "@workadventure/messages";
import { Unsubscriber } from "svelte/store";
import { mapEditorSelectedEntityPrefabStore } from "../../../../Stores/MapEditorStore";
import { GameMapFrontWrapper } from "../../GameMap/GameMapFrontWrapper";
import { GameScene } from "../../GameScene";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { MapEditorTool } from "./MapEditorTool";

export class EntityEditorTool extends MapEditorTool {
    private scene: GameScene;
    private mapEditorModeManager: MapEditorModeManager;

    private entityPrefabPreview: Phaser.GameObjects.Image | undefined;

    private mapEditorSelectedEntityPrefabStoreUnsubscriber!: Unsubscriber;

    constructor(mapEditorModeManager: MapEditorModeManager) {
        super();
        this.mapEditorModeManager = mapEditorModeManager;
        this.scene = this.mapEditorModeManager.getScene();

        this.entityPrefabPreview = undefined;

        this.subscribeToStores();
    }

    public update(time: number, dt: number): void {}
    public clear(): void {
        this.entityPrefabPreview?.destroy();
        this.entityPrefabPreview = undefined;
    }
    public activate(): void {}
    public destroy(): void {
        this.entityPrefabPreview?.destroy();
        this.entityPrefabPreview = undefined;
        this.mapEditorSelectedEntityPrefabStoreUnsubscriber();
    }
    public subscribeToGameMapFrontWrapperEvents(gameMapFrontWrapper: GameMapFrontWrapper): void {
        console.log("EntityEditorTool subscribeToGameMapFrontWrapperEvents");
    }
    public handleKeyDownEvent(event: KeyboardEvent): void {
        console.log("EntityEditorTool handleKeyDownEvent");
    }
    /**
     * Perform actions needed to see the changes instantly
     */
    public handleCommandExecution(commandConfig: CommandConfig): void {
        console.log("EntityEditorTool handleCommandExecution");
    }
    /**
     * React on commands coming from the outside
     */
    public handleIncomingCommandMessage(editMapCommandMessage: EditMapCommandMessage): void {
        console.log("EntityEditorTool handleIncomingCommandMessage");
    }

    private subscribeToStores(): void {
        this.mapEditorSelectedEntityPrefabStoreUnsubscriber = mapEditorSelectedEntityPrefabStore.subscribe(
            (entityPrefab: EntityPrefab | undefined) => {
                if (!entityPrefab) {
                    return;
                }
                this.entityPrefabPreview = this.scene.add.image(300, 300, entityPrefab.imagePath);
                this.scene.markDirty();
            }
        );
    }
}
