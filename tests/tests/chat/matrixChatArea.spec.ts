import type { Page} from "@playwright/test";
import test, {expect} from "@playwright/test";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import AreaEditor from "../utils/map-editor/areaEditor";
import Map from "../utils/map";
import { hideNoCamera } from "../utils/hideNoCamera";
import { oidcMatrixUserLogin, oidcMemberTagLogin } from "../utils/oidc";
import { resetWamMaps } from "../utils/map-editor/uploader";
import { getPage } from "../utils/auth";
import {isMobile} from "../utils/isMobile";
import chatUtils from "./chatUtils";

async function hideNoCameraIfWebkit(page: Page, browserName: string) {
  if (browserName === "webkit") {
    await hideNoCamera(page);
  }
}

test.describe("matrix chat area property @matrix @nowebit @nomobile", () => {
  test.beforeEach(
    "Ignore tests on mobilechromium because map editor not available for mobile devices",
    async ({ page, request }, { project }) => {
      // Map Editor not available on mobile / WebKit has issue with camera
      test.skip(isMobile(page) || project.name === 'webkit', 'Skip on mobile or WebKit');
      await chatUtils.resetMatrixDatabase();
      await resetWamMaps(request);
    }
  );

  test.afterAll("reset matrix database", async () => {
    await chatUtils.resetMatrixDatabase();
  });

  test("it should automatically open the chat when entering the area if the property is checked", async ({
    browserName, browser
  }) => {
    //await page.evaluate(() => localStorage.setItem('debug', '*'));
    await using page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    await hideNoCameraIfWebkit(page, browserName);

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);
    await Map.walkToPosition(page, 4 * 32, 3 * 32);

    await expect(page.getByTestId("closeChatButton")).toBeVisible();
    await expect(page.getByTestId("roomName")).toHaveText(
      "name of new room"
    );
    await page.context().close();
  });

  test("it should automatically close the chat when the user leaves the area", async ({
    browser,
    browserName,
  }) => {
    await using page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    await hideNoCameraIfWebkit(page, browserName);

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);
    await Map.walkToPosition(page, 4 * 32, 3 * 32);

    await expect(page.getByTestId("closeChatButton")).toBeVisible();

    await Map.walkToPosition(page, 1, 1);

    expect(await chatUtils.isChatSidebarOpen(page)).toBeFalsy();

    await page.context().close();
  });

  test("it should leave the matrix room when the user quits the room from an area with a matrix chat room link", async ({
    browser,
    browserName,
  }) => {
    await using page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    await hideNoCameraIfWebkit(page, browserName);

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);
    await Map.walkToPosition(page, 4 * 32, 3 * 32);

    await expect(page.getByTestId("closeChatButton")).toBeVisible();

    await page.goto(Map.url("empty"));
    await chatUtils.openChat(page);
    await chatUtils.openRoomAreaList(page);

    await expect(page.getByText("name of new room")).toBeHidden();


    await page.context().close();
  });

  test("it should be moderator in room when he have a admin tag (access to manage participants / can delete other message)", async ({
    browser,
    browserName,
  }) => {
    await using page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    await hideNoCameraIfWebkit(page, browserName);

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    
    //TODO : find a better way to wait for the room to be created

    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);

    
    //TODO : find a better way to wait for the room to be created

    await Map.walkToPosition(page, 4 * 32, 3 * 32);

    await expect(page.getByTestId("closeChatButton")).toBeVisible();


    await page.addLocatorHandler(page.getByTestId("cancelSSO"), async () => {
         await page.getByTestId("cancelSSO").click();
    });


    await page.getByTestId("chatBackward").click();
    await page.getByTestId("name of new room").hover() ;
    await page.getByTestId("name of new room").getByTestId("toggleRoomMenu").click();
    await page.getByTestId("manageParticipantOption").click()
    await expect(page.getByText("Manage participants")).toBeVisible({
      timeout: 60000
    });


    await page.context().close();
  });

  test("it shouldn't be moderator in room when he don't have a admin tag", async ({
    browserName,
    browser
  }) => {
    await using page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    await hideNoCameraIfWebkit(page, browserName);

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 2 * 32 * 1.5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);

    await page.context().close();
    await using page2 = await getPage(browser, 'Bob', Map.url("empty"));
    await oidcMemberTagLogin(page2);

    await hideNoCameraIfWebkit(page2, browserName);
    
    await Map.walkToPosition(page2, 4 * 32, 3 * 32);
    await expect(page2.getByTestId("closeChatButton")).toBeVisible();

    await page2.addLocatorHandler(page2.getByTestId("closeModal"), async () => {
      await page2.getByTestId("closeModal").click();
    });

    await page2.getByTestId("chatBackward").click();
    await page2.getByTestId("name of new room").hover() ; 
    await page2.getByTestId("name of new room").getByTestId("toggleRoomMenu").click();
    await expect(page2.getByTestId("manageParticipantOption")).not.toBeAttached();
  });
});
