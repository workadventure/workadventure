import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { resetWamMaps } from "./utils/map-editor/uploader";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import { login } from "./utils/roles";
import { map_storage_url } from "./utils/urls";
import { oidcAdminTagLogin, oidcLogout, oidcMemberTagLogin } from "./utils/oidc";
import EntityEditor from "./utils/map-editor/entityEditor";
import thematics from "./utils/thematics";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
  baseURL: map_storage_url,
});

test.describe("Map editor", () => {
  test.beforeEach(
    "Ignore tests on mobilechromium because map editor not available for mobile devices",
    ({}, { project }) => {
      //Map Editor not available on mobile
      if (project.name === "mobilechromium") {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
      }
    }
  );

  test.beforeEach("Ignore tests on webkit because of issue with camera and microphone", ({ browserName }) => {
    //WebKit has issue with camera
    if (browserName === "webkit") {
      //eslint-disable-next-line playwright/no-skipped-test
      test.skip();
      return;
    }
  });

  test("Successfully set Area with right access", async ({ page, request }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);

    await Menu.openMapEditor(page);
    await thematics.openAreaEditorAndAddAreaWithRights(page, ["admin"], ["admin"]);
    await Menu.closeMapEditor(page);
    await oidcLogout(page);

    await page.goto(Map.url("empty"));
    await page.waitForURL(Map.url("empty"));
    await Map.walkTo(page, "ArrowRight", 500);
    await Map.walkTo(page, "ArrowUp", 1000);

    await expect(page.getByText("Sorry, you don't have access to this area")).toBeAttached();
  });

  test("MapEditor is disabled for basic user because there are no thematics", async ({ page, request }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);

    await Menu.openMapEditor(page);

    const entityEditorButton = await page.locator(
      "section.side-bar-container .side-bar .tool-button button#EntityEditor"
    );
    await expect(entityEditorButton).not.toBeAttached();
  });

  test("Area with restricted write access : Trying to read an object", async ({ page, browser, request }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);

    // Second browser with member user trying to read the object
    const newBrowser = await browser.browserType().launch({});
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    await login(page2, "test2", 5);
    await oidcMemberTagLogin(page2);

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await thematics.openAreaEditorAndAddAreaWithRights(page, ["admin"], ["admin"]);
    await thematics.openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(page);
    await oidcLogout(page);

    // Expect user in other page to not have the right
    // to read the object
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await expect(page2.locator(".actions-menu .actions button").nth(0)).not.toBeAttached();
  });

  test("Area with restricted write access : Trying to read an object with read/write access", async ({
    page,
    browser,
    request,
  }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);

    // Second browser with member user trying to read the object
    const newBrowser = await browser.browserType().launch({});
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    await login(page2, "test2", 5);
    await oidcMemberTagLogin(page2);

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await thematics.openAreaEditorAndAddAreaWithRights(page, ["admin"], ["member"]);
    await thematics.openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(page);
    await oidcLogout(page);

    // Expect user in other page to not have the right
    // to read the object
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await expect(page2.locator(".actions-menu .actions button").nth(0)).toContainText("Open Link");
  });

  test("Area with restricted write access : Trying to add an object", async ({ page, browser, request }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);

    // Second browser with member user trying to read the object
    const newBrowser = await browser.browserType().launch({});
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    await login(page2, "test2", 5);
    await oidcMemberTagLogin(page2);

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await thematics.openAreaEditorAndAddAreaWithRights(page, ["admin"], ["admin"]);
    await oidcLogout(page);

    // From browser 2
    // Select entity and push it into the map
    // Expect to not have the entity property editor
    // by clicking on the entity position
    await Menu.openMapEditor(page2);
    await MapEditor.openEntityEditor(page2);
    await EntityEditor.selectEntity(page2, 0, "small table");
    await EntityEditor.moveAndClick(page2, thematics.entityPositionInArea.x, thematics.entityPositionInArea.y);
    await EntityEditor.clearEntitySelection(page2);
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await expect(
      page2.locator(".map-editor .sidebar .properties-buttons .add-property-button", { hasText: "Open Link" })
    ).not.toBeAttached();
  });

  test("Area with restricted write access : Trying to add an object with write access", async ({
    page,
    browser,
    request,
  }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);

    // Second browser with member user trying to read the object
    const newBrowser = await browser.browserType().launch({});
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    await login(page2, "test2", 5);
    await oidcMemberTagLogin(page2);

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await thematics.openAreaEditorAndAddAreaWithRights(page, ["member"], []);
    await oidcLogout(page);

    // From browser 2
    // Select entity and push it into the map
    // Expect to not have the entity property editor
    // by clicking on the entity position
    await Menu.openMapEditor(page2);
    await MapEditor.openEntityEditor(page2);
    await EntityEditor.selectEntity(page2, 0, "small table");
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await EntityEditor.clearEntitySelection(page2);
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await expect(
      page2.locator(".map-editor .sidebar .properties-buttons .add-property-button", { hasText: "Open Link" })
    ).toBeAttached();
  });

  test("Area with restricted write access : Trying to remove an object", async ({ page, browser, request }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);

    // Second browser with member user trying to read the object
    const newBrowser = await browser.browserType().launch({});
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    await login(page2, "test2", 5);
    await oidcMemberTagLogin(page2);

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await thematics.openAreaEditorAndAddAreaWithRights(page, ["admin"], ["member"]);
    await thematics.openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(page);
    await oidcLogout(page);

    // From browser 2
    // Try to remove entity and click on it to
    // check if removed or not
    // Expected not to be removed
    await Menu.openMapEditor(page2);
    await MapEditor.openTrashEditor(page2);
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await Menu.closeMapEditor(page2);
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await expect(page2.locator(".actions-menu .actions button").nth(0)).toContainText("Open Link");
  });

  test("Area with restricted write access : Trying to remove an object with write access", async ({
    page,
    browser,
    request,
  }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);

    // Second browser with member user trying to read the object
    const newBrowser = await browser.browserType().launch({});
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    await login(page2, "test2", 5);
    await oidcMemberTagLogin(page2);

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await thematics.openAreaEditorAndAddAreaWithRights(page, ["member"], []);
    await thematics.openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(page);
    await oidcLogout(page);

    // From browser 2
    // Try to remove entity and click on it to
    // check if removed or not
    // Expected to be removed
    await Menu.openMapEditor(page2);
    await MapEditor.openTrashEditor(page2);
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await Menu.closeMapEditor(page2);
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityInsideArea.y
    );

    await expect(page2.locator(".actions-menu .actions button").nth(0)).not.toBeAttached();
  });

  test("Area with restricted write access : Trying to remove an object outside the area", async ({
    page,
    browser,
    request,
  }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);
    await oidcAdminTagLogin(page);

    // Second browser with member user trying to read the object
    const newBrowser = await browser.browserType().launch({});
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    await login(page2, "test2", 5);
    await oidcMemberTagLogin(page2);

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await thematics.openAreaEditorAndAddAreaWithRights(page, ["admin"], []);
    await thematics.openEntityEditorAndAddEntityWithOpenLinkPropertyOutsideArea(page);
    await oidcLogout(page);

    // From browser 2
    // Try to remove entity and click on it to
    // check if removed or not
    // Expected to be removed
    await Menu.openMapEditor(page2);
    await MapEditor.openTrashEditor(page2);
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityOutsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityOutsideArea.y
    );
    await Menu.closeMapEditor(page2);
    await EntityEditor.moveAndClick(
      page2,
      thematics.mouseCoordinatesToClickOnEntityOutsideArea.x,
      thematics.mouseCoordinatesToClickOnEntityOutsideArea.y
    );

    await expect(page2.locator(".actions-menu .actions button").nth(0)).toContainText("Open Link");
  });
});
