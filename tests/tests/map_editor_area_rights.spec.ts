import { expect, test } from "@playwright/test";
import Map from "./utils/map";
import { resetWamMaps } from "./utils/map-editor/uploader";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import { map_storage_url } from "./utils/urls";
import { oidcLogout } from "./utils/oidc";
import EntityEditor from "./utils/map-editor/entityEditor";
import AreaAccessRights from "./utils/areaAccessRights";
import { evaluateScript } from "./utils/scripting";
import { getPage } from "./utils/auth";
import {isMobile} from "./utils/isMobile";

test.setTimeout(240_000); // Fix Webkit that can take more than 60s
test.use({
  baseURL: map_storage_url,
});

test.describe("Map editor area with rights @oidc", () => {
  test.beforeEach(
    "Ignore tests on mobilechromium because map editor not available for mobile devices",
    ({ page }) => {
      //Map Editor not available on mobile
      if (isMobile(page)) {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
      }
    }
  );

  test.beforeEach(
    "Ignore tests on webkit because of issue with camera and microphone",
    ({ browserName }) => {
      //WebKit has issue with camera
      if (browserName === "webkit") {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
      }
    }
  );

  test("Successfully set Area with right access", async ({ browser, request }) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1',
      Map.url("empty")
    );

    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["admin"],
      ["admin"]
    );
    await Menu.closeMapEditor(page);
    const anonymLoginPromise = page.waitForResponse(
      (response) =>
        response.url().includes("anonymLogin") && response.status() === 200
    );
    await oidcLogout(page);

    await anonymLoginPromise;

    await Map.walkTo(page, "ArrowRight", 500);
    await Map.walkTo(page, "ArrowUp", 1000);

    await expect(
      page.getByText("Sorry, you don't have access to this area")
    ).toBeAttached();
    await page.close();
    await page.context().close();
  });

  test("Access restricted area with right click to move", async ({ browser, request }) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1',
      Map.url("empty")
    );

    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["admin"],
      ["admin"]
    );
    await Menu.closeMapEditor(page);
    const anonymLoginPromise = page.waitForResponse(
      (response) =>
        response.url().includes("anonymLogin") && response.status() === 200
    );
    await oidcLogout(page);

    await anonymLoginPromise;

    const userCurrentPosition = await evaluateScript(page, async () => {
      return await WA.player.getPosition();
    });

    await page.mouse.click(
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.x,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.y,
      { button: "right" }
    );

    //Need to wait for player move action
    // eslint-disable-next-line
    await page.waitForTimeout(1000);

    const actualPositionAfterRightClickToMove = await evaluateScript(
      page,
      async () => {
        return await WA.player.getPosition();
      }
    );

    expect(userCurrentPosition).toEqual(actualPositionAfterRightClickToMove);
    await page.close();
    await page.context().close();
  });

  test("MapEditor is disabled for basic user because there are no thematics", async ({ browser, request }) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Alice',
      Map.url("empty")
    );
    // In the new design, you cannot access the map menu if the user is a basic user
    await expect(page.getByTestId('map-menu')).toBeHidden();
    /*await Menu.openMapEditor(page);

    const entityEditorButton = await page.locator(
      "section.side-bar-container .side-bar .tool-button button#EntityEditor"
    );
    await expect(entityEditorButton).not.toBeAttached();*/
    await page.close();
    await page.context().close();
  });

  test("Area with restricted write access : Trying to just read an object", async ({ browser, request }) => {
    // FIXME work step by step, else does not work
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1',
      Map.url("empty")
    );
    // Add area with admin rights
    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["admin"],
      ["admin"]
    );
    await AreaAccessRights.openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(
      page
    );
    await oidcLogout(page);

    // Second browser with member user trying to read the object
    const page2 = await getPage(browser, 'Member1',
      Map.url("empty")
    );

    // Expect user in other page to not have the right
    // to read the object
    //await page.pause();
    await EntityEditor.moveAndClick(
      page2,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.x,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    
    await expect(page2.getByTestId("openWebsite")).toBeHidden();

    await page2.close();
    await page.close();
    await page2.context().close();
    await page.context().close();
  });

  test("Area with restricted write access : Trying to read an object with read/write access",
     // FIXME same error in the test aboves
     async ({ browser, request,}) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1', Map.url("empty"))

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["admin"],
      ["member"]
    );
    await AreaAccessRights.openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(
      page
    );
    await oidcLogout(page);

    // Second browser with member user trying to read the object
    await page.close();
    await page.context().close();

    const page2 = await getPage(browser, 'Member1', Map.url("empty"))

    await page2.getByTestId('cameras-container').waitFor({ state: 'detached' });

    // Expect user in other page to not have the right
    // to read the object
    await EntityEditor.moveAndClick(
      page2,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.x,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.y
    );


    await expect(page2.getByRole('button', { name: 'Open Link' })).toBeVisible({ timeout: 10000 });

    await page2.close();
    await page2.context().close();

  });

  test("Area with restricted write access : Trying to just add an object", async ({ browser, request }) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1', Map.url('empty'));

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["admin"],
      ["admin"]
    );
    await Menu.closeMapEditor(page);
    await oidcLogout(page);

    // Second browser with member user trying to read the object
    const page2 = await getPage(browser, 'Member1', Map.url("empty"))

    //From browser 2 
    //Check that the entity editor is not available
    await expect(page2.getByRole('button', { name: 'Map editor' })).not.toBeAttached();

    await page2.keyboard.press("e");
    await expect(page2.locator("#map-editor-container")).toBeVisible();
    await expect(page2.locator("#AreaEditor")).toBeHidden();
    await expect(page2.locator("#EntityEditor")).toBeHidden();

    await page2.close();
    await page2.context().close();
    await page.close();
    await page.context().close();
  });

  test("Area with restricted write access : Trying to add an object with write access", 
    async ({ browser, request }) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1', Map.url("empty"));

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["member"],
      []
    );
    await Menu.closeMapEditor(page);
    await oidcLogout(page);
    await page.close();
    await page.context().close();

    // Second browser with member user trying to read the object
    const page2 = await getPage(browser, 'Member1', Map.url("empty"));

    // From browser 2
    // Select entity and push it into the map
    // Expect to not have the entity property editor
    // by clicking on the entity position
    await page2.getByTestId('cameras-container').waitFor({ state: 'detached' });
    await Menu.openMapEditor(page2);
    await MapEditor.openEntityEditor(page2);
    await EntityEditor.selectEntity(page2, 0, "small table");
    await EntityEditor.moveAndClick(
      page2,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.x,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await EntityEditor.clearEntitySelection(page2);
    await EntityEditor.moveAndClick(
      page2,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.x,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    await expect(
      page2.getByTestId("openWebsite")
    ).toBeAttached();
    await page2.close();
    await page2.context().close();
  });

  test("Area with restricted write access : Trying to remove an object", async ({ browser, request }) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1', Map.url("empty"));

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["admin"],
      ["member"]
    );
    await AreaAccessRights.openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(
      page
    );
    await oidcLogout(page);
    await page.close();
    await page.context().close();

    // Second browser with member user trying to read the object
    const page2 = await getPage(browser, 'Member1', Map.url("empty"));

    // From browser 2
    // Try to remove entity and click on it to
    // check if removed or not
    // Expected not to be removed

    await expect(page2.getByRole('button', { name: 'Map editor' })).not.toBeAttached();

    await page2.keyboard.press("e");

    await expect(page2.locator("#map-editor-container")).toBeVisible();
    await expect(page2.locator("#AreaEditor")).toBeHidden();
    await expect(page2.locator("#EntityEditor")).toBeHidden();


    await page2.close();
    await page2.context().close();
  });

  test("Area with restricted write access : Trying to remove an object with write access", 
    async ({ browser, request }) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1', Map.url("empty"))

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["member"],
      []
    );
    await AreaAccessRights.openEntityEditorAndAddEntityWithOpenLinkPropertyInsideArea(
      page
    );
    await oidcLogout(page);

    // Second browser with member user trying to read the object
    const page2 = await getPage(browser, 'Member1', Map.url("empty"));

    // From browser 2
    // Try to remove entity and click on it to
    // check if removed or not
    // Expected to be removed
    await Menu.openMapEditor(page2);
    await MapEditor.openTrashEditor(page2);
    await EntityEditor.moveAndClick(
      page2,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.x,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.y
    );
    // Note: we need to use the "close button" in the tools bar because the other close button is minified.
    await page2.getByTestId('closeMapEditorButton').click();
    //await Menu.closeMapEditor(page2);
    await EntityEditor.moveAndClick(
      page2,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.x,
      AreaAccessRights.mouseCoordinatesToClickOnEntityInsideArea.y
    );

    await expect(page2.getByTestId("openWebsite")).toBeHidden();
    await page2.close();
    await page2.context().close();
    await page.close();
    await page.context().close();
  });

  test("Area with restricted write access : Trying to remove an object outside the area",
     async ({ browser, request }) => {
    await resetWamMaps(request);
    const page = await getPage(browser, 'Admin1', Map.url("empty"));

    // Add area with admin rights
    await Menu.openMapEditor(page);
    await AreaAccessRights.openAreaEditorAndAddAreaWithRights(
      page,
      ["admin"],
      []
    );
    await AreaAccessRights.openEntityEditorAndAddEntityWithOpenLinkPropertyOutsideArea(
      page
    );
    await oidcLogout(page);

    // Second browser with member user trying to read the object
    const page2 = await getPage(browser, 'Member1', Map.url("empty"));

       // From browser 2
       // Check that the map editor is not available
       await expect(page2.getByRole('button', { name: 'Map editor' })).not.toBeAttached();

       await page2.keyboard.press("e");

       await expect(page2.locator("#map-editor-container")).toBeVisible();
       await expect(page2.locator("#AreaEditor")).toBeHidden();
       await expect(page2.locator("#EntityEditor")).toBeHidden();

    await page2.context().close();
    await page.close();
    await page.context().close()
  });
  
});
