import { writable } from "svelte/store";
import { connectionManager } from "../Connexion/ConnectionManager";
import { ENABLE_FEATURE_MAP_EDITOR } from "../Enum/EnvironmentVariable";
import { AreaPreview } from "../Phaser/Components/MapEditor/AreaPreview";

function createMapEditorModeStore() {
    const { set, subscribe } = writable(false);

    return {
        subscribe,
        switchMode: (value: boolean) => {
            set(ENABLE_FEATURE_MAP_EDITOR && connectionManager.currentRoom?.canEditMap === true && value);
        },
    };
}

export const mapEditorModeStore = createMapEditorModeStore();

export const mapEditorModeDragCameraPointerDownStore = writable(false);

export const mapEditorSelectedAreaPreviewStore = writable<AreaPreview | undefined>(undefined);
