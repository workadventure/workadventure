import type { EntityDataProperties, EntityPrefab } from "@workadventure/map-editor";
import { writable } from "svelte/store";
import { DeleteCustomEntityMessage, ModifyCustomEntityMessage, UploadEntityMessage } from "@workadventure/messages";
import type { AreaPreview } from "../Phaser/Components/MapEditor/AreaPreview";
import { EditorToolName } from "../Phaser/Game/MapEditor/MapEditorModeManager";
import { Entity } from "../Phaser/ECS/Entity";

type ObjectValues<T> = T[keyof T];

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

const MAP_EDITOR_ENTITY_TOOL_MODE = {
    ADD: "ADD",
    EDIT: "EDIT",
} as const;

const MAP_EDITOR_AREA_TOOL_MODE = {
    ADD: "ADD",
    EDIT: "EDIT",
} as const;

export type MapEditorEntityToolMode = ObjectValues<typeof MAP_EDITOR_ENTITY_TOOL_MODE>;
export type MapEditorAreaToolMode = ObjectValues<typeof MAP_EDITOR_AREA_TOOL_MODE>;

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

export enum WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM {
    Megaphone = "Megaphone",
    RoomSettings = "Room Settings",
}

export const mapEditorWamSettingsEditorToolCurrentMenuItemStore = writable<
    WAM_SETTINGS_EDITOR_TOOL_MENU_ITEM | undefined
>(undefined);

export const mapExplorationModeStore = writable<boolean>(false);
export const mapExplorationObjectSelectedStore = writable<Entity | AreaPreview | undefined>(undefined);
export const mapExplorationEntitiesStore = writable<Map<string, Entity>>(new Map());
export const mapExplorationAreasStore = writable<Map<string, AreaPreview> | undefined>(new Map());
