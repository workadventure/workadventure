import type { PredefinedPropertyData, EntityPrefab } from "@workadventure/map-editor";
import { writable, get } from "svelte/store";
import type { AreaPreview } from "../Phaser/Components/MapEditor/AreaPreview";
import { EditorToolName } from "../Phaser/Game/MapEditor/MapEditorModeManager";
import { Entity } from "../Phaser/ECS/Entity";
import { mapEditorActivated } from "./MenuStore";

function createMapEditorModeStore() {
    const { set, subscribe } = writable(false);

    return {
        subscribe,
        switchMode: (value: boolean) => {
            set(get(mapEditorActivated) && value);
        },
    };
}

export enum MapEntityEditorMode {
    AddMode = "AddMode",
    EditMode = "EditMode",
}

export function onMapEditorInputFocus() {
    mapEditorInputStore.set(true);
}

export function onMapEditorInputUnfocus() {
    mapEditorInputStore.set(false);
}

export const mapEditorModeStore = createMapEditorModeStore();

export const mapEditorInputStore = writable(false);

export const mapEditorSelectedAreaPreviewStore = writable<AreaPreview | undefined>(undefined);

export const mapEditorSelectedEntityStore = writable<Entity | undefined>(undefined);

export const mapEditorSelectedPropertyStore = writable<PredefinedPropertyData | undefined>(undefined);

export const mapEditorSelectedToolStore = writable<EditorToolName | undefined>(undefined);

export const mapEditorSelectedEntityPrefabStore = writable<EntityPrefab | undefined>(undefined);

export const mapEntityEditorModeStore = writable<MapEntityEditorMode>(MapEntityEditorMode.AddMode);
