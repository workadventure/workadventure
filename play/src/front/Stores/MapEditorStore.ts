import type { AreaData, EntityDataProperties, EntityPrefab } from "@workadventure/map-editor";
import { writable } from "svelte/store";
import type {
    DeleteCustomEntityMessage,
    ModifyCustomEntityMessage,
    UploadEntityMessage,
} from "@workadventure/messages";
import type { AreaPreview } from "../Phaser/Components/MapEditor/AreaPreview";
import type { Entity } from "../Phaser/ECS/Entity";
import type { EditorToolName } from "../Phaser/Game/MapEditor/MapEditorModeManager";

export const mapEditorVisibilityStore = writable<boolean>(true);

function createMapEditorModeStore() {
    const { set, subscribe } = writable(false);

    subscribe((value) => {
        mapEditorVisibilityStore.set(value === true);
    });

    return {
        subscribe,
        set,
        switchMode: (value: boolean) => {
            set(value);
        },
    };
}

function createMapEditorSelectedEntityStore() {
    const { subscribe, update } = writable<Entity | undefined>(undefined);

    return {
        subscribe,
        set: (value: Entity | undefined) => {
            update((oldValue) => {
                oldValue?.removeEditColor();
                return value;
            });
        },
    };
}

export type MapEditorEntityToolMode = "ADD" | "EDIT";
export type MapEditorAreaToolMode = "ADD" | "EDIT";

export const mapEditorModeStore = createMapEditorModeStore();

export const mapEditorSelectedEntityStore = createMapEditorSelectedEntityStore();

export const mapEditorSelectedEntityDraggedStore = writable<boolean>(false);

export const mapEditorSelectedAreaPreviewStore = writable<AreaPreview | undefined>(undefined);

export const mapEditorAreaModeStore = writable<MapEditorEntityToolMode>("ADD");

export const mapEditorSelectedToolStore = writable<EditorToolName | undefined>(undefined);

export const mapEditorSelectedEntityPrefabStore = writable<EntityPrefab | undefined>(undefined);

export const mapEditorCopiedEntityDataPropertiesStore = writable<EntityDataProperties | undefined>(undefined);

export const mapEditorEntityModeStore = writable<MapEditorEntityToolMode>("ADD");

export const mapEditorEntityUploadEventStore = writable<UploadEntityMessage | undefined>(undefined);
export const mapEditorModifyCustomEntityEventStore = writable<ModifyCustomEntityMessage | undefined>(undefined);
export const mapEditorDeleteCustomEntityEventStore = writable<DeleteCustomEntityMessage | undefined>(undefined);

export const mapEditorEntityFileDroppedStore = writable<boolean>(false);

export enum WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM {
    Megaphone = "Megaphone",
    RoomSettings = "Room Settings",
    MatrixRoomList = "Matrix Room List",
}

export const mapEditorWamSettingsEditorToolCurrentMenuItemStore = writable<
    WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM | undefined
>(undefined);

export const mapExplorationModeStore = writable<boolean>(false);
export const mapExplorationObjectSelectedStore = writable<Entity | AreaPreview | undefined>(undefined);
export const mapExplorationEntitiesStore = writable<Map<string, Entity>>(new Map());
export const mapExplorationAreasStore = writable<Map<string, AreaPreview> | undefined>(new Map());
export const mapEditorAskToClaimPersonalAreaStore = writable<AreaData | undefined>(undefined);

export type SelectableTag = string | undefined;
export const selectCategoryStore = writable<SelectableTag>(undefined);

export const mapEditorRestrictedPropertiesStore = writable<string[]>([]);
