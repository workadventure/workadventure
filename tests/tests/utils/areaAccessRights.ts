import { expect } from "@playwright/test";
import AreaEditor from "./map-editor/areaEditor";
import EntityEditor from "./map-editor/entityEditor";
import MapEditor from "./mapeditor";
import Menu from "./menu";

interface Coordinates {
  x: number;
  y: number;
}

class AreaAccessRights {
  private areaSize: { topLeft: Coordinates; bottomRight: Coordinates } = {
    topLeft: { x: 1, y: 5 },
    bottomRight: { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 },
  };

  public entityPositionInArea: Coordinates = { x: 6 * 32, y: 3 * 32 };
  public entityPositionOutsideArea: Coordinates = { x: 6 * 32, y: 8 * 32 };

  public mouseCoordinatesToClickOnEntityInsideArea = {
    x: this.entityPositionInArea.x + 10,
    y: this.entityPositionInArea.y,
  };

  public mouseCoordinatesToClickOnEntityOutsideArea = {
    x: this.entityPositionOutsideArea.x + 10,
    y: this.entityPositionOutsideArea.y,
  };

  async openAreaEditorAndAddAreaWithRights(
    page,
    writeRights: string[] = [],
    readRights: string[] = []
  ) {
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      this.areaSize.topLeft,
      this.areaSize.bottomRight
    );
    await AreaEditor.setAreaRightProperty(page, writeRights, readRights);
  }

  async openAreaEditorAndAddArea(page, topLeft?: Coordinates, bottomRight?: Coordinates) {
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      topLeft || this.areaSize.topLeft,
      bottomRight || this.areaSize.bottomRight
    );
  }

  async openEntityEditorAndAddEntityWithOpenLinkPropertyOutsideArea(page) {
    await MapEditor.openEntityEditor(page);
    await EntityEditor.selectEntity(page, 0, "small table");
    await EntityEditor.moveAndClick(
      page,
      this.entityPositionOutsideArea.x,
      this.entityPositionOutsideArea.y
    );
    await EntityEditor.clearEntitySelection(page);
    await EntityEditor.moveAndClick(
      page,
      this.mouseCoordinatesToClickOnEntityOutsideArea.x,
      this.mouseCoordinatesToClickOnEntityOutsideArea.y
    );
    await EntityEditor.addProperty(page, "openWebsite");
    await page
      .getByPlaceholder("https://workadventu.re")
      .first()
      .fill("https://workadventu.re");
    await Menu.closeMapEditor(page);
    await EntityEditor.moveAndClick(
      page,
      this.mouseCoordinatesToClickOnEntityOutsideArea.x,
      this.mouseCoordinatesToClickOnEntityOutsideArea.y
    );
    await expect(page.getByRole('button', { name: 'Open Link' })).toBeVisible();
  }

  async openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(page) {
    await MapEditor.openEntityEditor(page);
    await EntityEditor.selectEntity(page, 0, "small table");
    await EntityEditor.moveAndClick(
      page,
      this.entityPositionInArea.x,
      this.entityPositionInArea.y
    );
    await EntityEditor.clearEntitySelection(page);
    await EntityEditor.moveAndClick(
      page,
      this.mouseCoordinatesToClickOnEntityInsideArea.x,
      this.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await EntityEditor.addProperty(page, "openWebsite");
    await page
      .getByPlaceholder("https://workadventu.re")
      .first()
      .fill("https://workadventu.re");
    await Menu.closeMapEditor(page);
    await EntityEditor.moveAndClick(
      page,
      this.mouseCoordinatesToClickOnEntityInsideArea.x,
      this.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await expect(page.getByRole('button', { name: 'Open Link' })).toBeVisible();
  }
}

export default new AreaAccessRights();
