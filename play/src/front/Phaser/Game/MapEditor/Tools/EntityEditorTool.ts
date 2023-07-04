import { EntityData, WAMEntityData } from "@workadventure/map-editor";
import { Entity } from "../../../ECS/Entity";
import { CopyEntityEventData, EntitiesManagerEvent } from "../../GameMap/EntitiesManager";
import { MapEditorModeManager } from "../MapEditorModeManager";
import { CreateEntityFrontCommand } from "../Commands/Entity/CreateEntityFrontCommand";
import { DeleteEntityFrontCommand } from "../Commands/Entity/DeleteEntityFrontCommand";
import { UpdateEntityFrontCommand } from "../Commands/Entity/UpdateEntityFrontCommand";
import { EntityRelatedEditorTool } from "./EntityRelatedEditorTool";

export class EntityEditorTool extends EntityRelatedEditorTool {
    constructor(mapEditorModeManager: MapEditorModeManager) {
        super(mapEditorModeManager);
        this.bindEntitiesManagerEventHandlers();
    }

    protected bindEntitiesManagerEventHandlers(): void {
        this.entitiesManager.on(EntitiesManagerEvent.DeleteEntity, (entity: Entity) => {
            this.mapEditorModeManager
                .executeCommand(
                    new DeleteEntityFrontCommand(
                        this.scene.getGameMap(),
                        entity.entityId,
                        undefined,
                        this.entitiesManager
                    )
                )
                .catch((e) => console.error(e));
        });
        this.entitiesManager.on(EntitiesManagerEvent.UpdateEntity, (entityData: EntityData) => {
            this.mapEditorModeManager
                .executeCommand(
                    new UpdateEntityFrontCommand(
                        this.scene.getGameMap(),
                        entityData.id,
                        entityData,
                        undefined,
                        undefined,
                        this.entitiesManager,
                        this.scene
                    )
                )
                .catch((e) => console.error(e));
        });
        this.entitiesManager.on(EntitiesManagerEvent.CopyEntity, (data: CopyEntityEventData) => {
            if (!CopyEntityEventData.parse(data)) {
                return;
            }
            const entityData: WAMEntityData = {
                x: data.position.x,
                y: data.position.y,
                prefabRef: data.prefabRef,
                properties: data.properties ?? [],
            };
            this.mapEditorModeManager
                .executeCommand(
                    new CreateEntityFrontCommand(
                        this.scene.getGameMap(),
                        undefined,
                        entityData,
                        undefined,
                        this.entitiesManager
                    )
                )
                .catch((e) => console.error(e));
            this.cleanPreview();
        });
    }
}
