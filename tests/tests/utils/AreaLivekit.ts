import type {Page} from "@playwright/test";
import AreaEditor from "./map-editor/areaEditor";
import MapEditor from "./mapeditor";
import Menu from "./menu";

interface Coordinates {
  x: number;
  y: number;
}

class AreaLivekit {
  private areaSize: { topLeft: Coordinates; bottomRight: Coordinates } = {
    topLeft: { x: 1, y: 2 * 32 * 1.5 },
    bottomRight: { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 },
  };

  public entityPositionInArea: Coordinates = { x: 4 * 32 * 1.5, y: 3 * 32 * 1.5 };
  public entityPositionOutsideArea: Coordinates = { x: 6 * 32 * 1.5, y: 8 * 32 * 1.5 };

  public mouseCoordinatesToClickOnEntityInsideArea = {
    x: this.entityPositionInArea.x + 10,
    y: this.entityPositionInArea.y - 50,
  };

  public mouseCoordinatesToClickOnEntityOutsideArea = {
    x: this.entityPositionOutsideArea.x + 10,
    y: this.entityPositionOutsideArea.y,
  };


  async openAreaEditorAndAddAreaLivekit(page: Page , startWithAudioMuted = false, startWithVideoMuted = false) {
    await Menu.openMapEditor(page);
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, this.areaSize.topLeft, this.areaSize.bottomRight);
    await AreaEditor.setAreaLiveKitProperty(page, startWithAudioMuted, startWithVideoMuted);
  
  }



}

export default new AreaLivekit();
