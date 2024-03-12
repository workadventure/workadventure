import { expect, test, webkit } from "@playwright/test";
import Map from "./utils/map";
import AreaEditor from "./utils/map-editor/areaEditor";
import { resetWamMaps } from "./utils/map-editor/uploader";
import MapEditor from "./utils/mapeditor";
import Menu from "./utils/menu";
import { login } from "./utils/roles";
import { map_storage_url } from "./utils/urls";

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

  test('Successfully set Area with right access"', async ({ page, browser, request }) => {
    await resetWamMaps(request);

    await page.goto(Map.url("empty"));
    await login(page, "test", 3);

    await Menu.openMapEditor(page);
    await MapEditor.openAreaEditor(page);
    await AreaEditor.drawArea(page, { x: 1 * 32 * 1.5, y: 5 }, { x: 9 * 32 * 1.5, y: 4 * 32 * 1.5 });
    await AreaEditor.setAreaRightProperty(page, ["admin", "member"], ["admin"]);
    await Menu.closeMapEditor(page);
    await Map.walkTo(page, "ArrowRight", 500);
    await Map.walkTo(page, "ArrowUp", 1000);

    expect(await page.getByTestId("warning-toast")).toBeAttached();

    // Second browser
    const newBrowser = await browser.browserType().launch();
    const page2 = await newBrowser.newPage();
    await page2.goto(Map.url("empty"));
    await login(page2, "test2", 5);
    await Map.walkTo(page2, "ArrowRight", 500);
    await Map.walkTo(page2, "ArrowUp", 1000);

    await expect(page2.getByTestId("warning-toast")).toBeAttached();
  });
});
