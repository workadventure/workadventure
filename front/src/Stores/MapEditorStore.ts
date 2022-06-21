import { writable } from "svelte/store";
import { AreaPreview } from "../Phaser/Components/MapEditor/AreaPreview";

export const mapEditorModeStore = writable(false);

export const mapEditorModeDragCameraPointerDownStore = writable(false);

export const mapEditorSelectedAreaPreviewStore = writable<AreaPreview | undefined>(undefined);
