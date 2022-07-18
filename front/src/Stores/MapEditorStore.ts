import { writable } from "svelte/store";
import { ENABLE_FEATURE_MAP_EDITOR } from "../Enum/EnvironmentVariable";
import { AreaPreview } from "../Phaser/Components/MapEditor/AreaPreview";

function createMapEditorModeStore() {
    const { set, subscribe } = writable(false);

    return {
        subscribe,
        switchMode: (value: boolean) => {
            set(ENABLE_FEATURE_MAP_EDITOR && value);
        },
    };
}

export const mapEditorModeStore = createMapEditorModeStore();

export const mapEditorModeDragCameraPointerDownStore = writable(false);

export const mapEditorSelectedAreaPreviewStore = writable<AreaPreview | undefined>(undefined);
