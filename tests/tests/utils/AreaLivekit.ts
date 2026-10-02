import type { Page } from "@playwright/test";
import AreaEditor from "./map-editor/areaEditor";
import MapEditor from "./mapeditor";
import Menu from "./menu";

interface Coordinates {
    x: number;
    y: number;
}

class AreaLivekit {
    private areaSize: { topLeft: Coordinates; bottomRight: Coordinates } = {
        topLeft: { x: 1, y: 2 * 32 },
        bottomRight: { x: 7 * 32, y: 4 * 32 },
    };

    public entityPositionInArea: Coordinates = { x: 4 * 32, y: 3 * 32 };

    async openAreaEditorAndAddAreaLivekit(page: Page, startWithAudioMuted = false, startWithVideoMuted = false) {
        await Menu.openMapEditor(page);
        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, this.areaSize.topLeft, this.areaSize.bottomRight);
        await AreaEditor.setAreaLiveKitProperty(page, startWithAudioMuted, startWithVideoMuted);
    }
}

export default new AreaLivekit();
