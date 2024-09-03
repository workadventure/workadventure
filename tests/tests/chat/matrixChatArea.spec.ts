import test, { expect } from "@playwright/test";
import MapEditor from "../utils/mapeditor";
import Menu from "../utils/menu";
import AreaEditor from "../utils/map-editor/areaEditor";
import Map from "../utils/map";
import {hideNoCamera, login} from "../utils/roles";
import { oidcMatrixUserLogin} from "../utils/oidc";
import {resetWamMaps} from "../utils/map-editor/uploader";
import chatUtils from "./chatUtils";

test.describe("matrix chat area property",()=>{
    test.beforeEach(
        "Ignore tests on mobilechromium because map editor not available for mobile devices",
        async ({page,request}, {project}) => {
            //Map Editor not available on mobile
            if (project.name === "mobilechromium") {
                //eslint-disable-next-line playwright/no-skipped-test
                test.skip();
                return;
            }
            chatUtils.resetMatrixDatabase()
            await resetWamMaps(request);
        
            await page.goto(Map.url("empty"));
        }
    );

    test.afterAll('reset matrix database',()=>{
        chatUtils.resetMatrixDatabase() 
    });

    test("it should automatically open the chat when entering the area if the property is checked", async ({page, browserName}) => {

        //await page.evaluate(() => localStorage.setItem('debug', '*'));
        await login(page, "test", 3, "en-US", false);
        await oidcMatrixUserLogin(page, false);

        // Because webkit in playwright does not support Camera/Microphone Permission by settings
        if (browserName === "webkit") {
            await hideNoCamera(page);
        }

        await Map.teleportToPosition(page, 5 * 32, 5 * 32);
       // await chatUtils.openChat(page);

        await Menu.openMapEditor(page);

        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 1 * 32 * 1.5, y: 5}, {x: 9 * 32 * 1.5, y: 4 * 32 * 1.5});
        await AreaEditor.addProperty(page, "Link Matrix room");
        await AreaEditor.setMatrixChatRoomProperty(page,true,"name of new room");
        //TODO : remove this timeout - useful to wait pusher response
        await page.waitForTimeout(1000);
        
        
        await Menu.closeMapEditor(page);
        await Map.walkToPosition(page, 4 * 32, 2 * 32);

        expect(await chatUtils.isChatSidebarOpen(page)).toBeTruthy();
        expect(await page.getByTestId("roomName").textContent()).toBe("name of new room");

    });


    test("it should automatically close the chat when the user leaves the area", async ({page, browserName}) => {

        await login(page, "test", 3, "en-US", false);
        await oidcMatrixUserLogin(page, false);

        if (browserName === "webkit") {
            await hideNoCamera(page);
        }

        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        await Menu.openMapEditor(page);

        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 1 * 32 * 1.5, y: 5}, {x: 9 * 32 * 1.5, y: 4 * 32 * 1.5});
        await AreaEditor.addProperty(page, "Link Matrix room");
        await AreaEditor.setMatrixChatRoomProperty(page,true,"name of new room");
        //TODO : remove this timeout - useful to wait pusher response 
        await page.waitForTimeout(1000);
        
        
        await Menu.closeMapEditor(page);
        await Map.walkToPosition(page, 4 * 32, 2 * 32);

        expect(await chatUtils.isChatSidebarOpen(page)).toBeTruthy();

        await Map.walkToPosition(page,1, 1);

        expect(await chatUtils.isChatSidebarOpen(page)).toBeFalsy();

    });


    test("it should leave the matrix room when the user quits the room from an area with a matrix chat room link", async ({page, browserName}) => {

        await login(page, "test", 3, "en-US", false);
        await oidcMatrixUserLogin(page, false);

        if (browserName === "webkit") {
            await hideNoCamera(page);
        }

        await Map.teleportToPosition(page, 5 * 32, 5 * 32);

        await Menu.openMapEditor(page);

        await MapEditor.openAreaEditor(page);
        await AreaEditor.drawArea(page, {x: 1 * 32 * 1.5, y: 5}, {x: 9 * 32 * 1.5, y: 4 * 32 * 1.5});
        await AreaEditor.addProperty(page, "Link Matrix room");
        await AreaEditor.setMatrixChatRoomProperty(page,true,"name of new room");

        //TODO : remove this timeout - useful to wait pusher response 
        await page.waitForTimeout(1000);
        
        
        await Menu.closeMapEditor(page);
        await Map.walkToPosition(page, 4 * 32, 2 * 32);

        expect(await chatUtils.isChatSidebarOpen(page)).toBeTruthy();

        await page.goto(Map.url("empty"));
        await chatUtils.openChat(page);
        await chatUtils.openRoomAreaList(page);

        expect(await page.getByText("name of new room").isVisible()).toBeFalsy();
    });

})