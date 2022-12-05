import type { PredefinedPropertyData, EntityPrefab } from "@workadventure/map-editor";
import { writable } from "svelte/store";
import { connectionManager } from "../Connexion/ConnectionManager";
import { ENABLE_FEATURE_MAP_EDITOR } from "../Enum/EnvironmentVariable";
import type { AreaPreview } from "../Phaser/Components/MapEditor/AreaPreview";
import { EditorToolName } from "../Phaser/Game/MapEditor/MapEditorModeManager";
import { Entity } from "../Phaser/ECS/Entity";
import { MapEntitiesPrefabsStore } from "./MapEntitiesPrefabsStore";

function createMapEditorModeStore() {
    const { set, subscribe } = writable(false);

    return {
        subscribe,
        switchMode: (value: boolean) => {
            set(ENABLE_FEATURE_MAP_EDITOR && connectionManager.currentRoom?.canEditMap === true && value);
        },
    };
}

export enum MapEntityEditorMode {
    AddMode = "AddMode",
    EditMode = "EditMode",
    RemoveMode = "RemoveMode",
}

export function onMapEditorInputFocus() {
    mapEditorInputStore.set(true);
}

export function onMapEditorInputUnfocus() {
    mapEditorInputStore.set(false);
}

export const mapEditorModeStore = createMapEditorModeStore();

export const mapEditorInputStore = writable(false);

export const mapEditorModeDragCameraPointerDownStore = writable(false);

export const mapEditorSelectedAreaPreviewStore = writable<AreaPreview | undefined>(undefined);

export const mapEditorSelectedEntityStore = writable<Entity | undefined>(undefined);

export const mapEditorSelectedPropertyStore = writable<PredefinedPropertyData | undefined>(undefined);

export const mapEditorSelectedToolStore = writable<EditorToolName | undefined>(undefined);

export const mapEntitiesPrefabsStore = new MapEntitiesPrefabsStore();

export const mapEditorSelectedEntityPrefabStore = writable<EntityPrefab | undefined>(undefined);

export const mapEntityEditorModeStore = writable<MapEntityEditorMode>(MapEntityEditorMode.AddMode);
