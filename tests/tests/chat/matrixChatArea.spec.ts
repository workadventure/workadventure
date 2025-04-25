import test, { expect } from "@playwright/test";
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

test.describe("matrix chat area property @matrix", () => {
  test.beforeEach(
    "Ignore tests on mobilechromium because map editor not available for mobile devices",
    async ({ page, request }, { project }) => {
      //Map Editor not available on mobile / WebKit has issue with camera
      if (isMobile(page) || project.name === "webkit") {
        //eslint-disable-next-line playwright/no-skipped-test
        test.skip();
        return;
      }
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
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    // Because webkit in playwright does not support Camera/Microphone Permission by settings
    if (browserName === "webkit") {
      await hideNoCamera(page);
    }

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);
    await Map.walkToPosition(page, 4 * 32, 2 * 32);

    await expect(page.getByTestId("closeChatButton")).toBeVisible();
    expect(await page.getByTestId("roomName").textContent()).toBe(
      "name of new room"
    );
    await page.close();
    await page.context().close();
  });

  test("it should automatically close the chat when the user leaves the area", async ({
    browser,
    browserName,
  }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    if (browserName === "webkit") {
      await hideNoCamera(page);
    }

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);
    await Map.walkToPosition(page, 4 * 32, 2 * 32);

    await expect(page.getByTestId("closeChatButton")).toBeVisible();

    await Map.walkToPosition(page, 1, 1);

    expect(await chatUtils.isChatSidebarOpen(page)).toBeFalsy();
    await page.close();
    await page.context().close();
  });

  test("it should leave the matrix room when the user quits the room from an area with a matrix chat room link", async ({
    browser,
    browserName,
  }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    if (browserName === "webkit") {
      await hideNoCamera(page);
    }

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);
    await Map.walkToPosition(page, 4 * 32, 2 * 32);

    await expect(page.getByTestId("closeChatButton")).toBeVisible();

    await page.goto(Map.url("empty"));
    await chatUtils.openChat(page);
    await chatUtils.openRoomAreaList(page);

    expect(await page.getByText("name of new room").isVisible()).toBeFalsy();

    await page.close();
      await page.context().close();
  });

  test("it should be moderator in room when he have a admin tag (access to manage participants / can delete other message)", async ({
    browser,
    browserName,
  }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    if (browserName === "webkit") {
      await hideNoCamera(page);
    }

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    
    //TODO : find a better way to wait for the room to be created

    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);

    
    //TODO : find a better way to wait for the room to be created

    await Map.walkToPosition(page, 4 * 32, 2 * 32);

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

  });

  test("it shouldn't be moderator in room when he don't have a admin tag ", async ({
    browserName,
    browser
  }) => {
    const page = await getPage(browser, 'Alice', Map.url("empty"));
    await oidcMatrixUserLogin(page);

    if (browserName === "webkit") {
      await hideNoCamera(page);
    }

    await Map.teleportToPosition(page, 5 * 32, 5 * 32);

    await Menu.openMapEditor(page);

    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(
      page,
      { x: 1 * 32 * 1.5, y: 5 },
      { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 }
    );
    await AreaEditor.addProperty(page, "matrixRoomPropertyData");
    await AreaEditor.setMatrixChatRoomProperty(page, true, "name of new room");

    await Menu.closeMapEditor(page);
    //await page.close()
    const page2 = await getPage(browser, 'Bob', Map.url("empty"));
    await oidcMemberTagLogin(page2);
    
    if (browserName === "webkit") {
      await hideNoCamera(page2);
    }
    
    await Map.walkToPosition(page2, 4 * 32, 2 * 32);
    
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
