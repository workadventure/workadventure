import { Selector } from "testcafe";
import { login } from "./utils/roles";

fixture`Translation`
  .page`http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json`;

test("Test that I can switch to French", async (t: TestController) => {
  const languageSelect = Selector(".languages-switcher");
  const languageOption = languageSelect.find("option");

  await login(
    t,
    "http://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/mousewheel.json"
  );

  await t
    .click(".menuIcon img:first-child")
    .click(Selector("button").withText("Settings"))
    .click(".languages-switcher")
    .click(languageOption.withText("Français (France)"))
    .click(Selector("button").withText("Save"))
    .wait(5000)

    .click(".menuIcon img:first-child")
    .expect(Selector("button").withText("Paramètres").innerText)
    .contains("Paramètres");

  t.ctx.passed = true;
}).after(async (t) => {
  if (!t.ctx.passed) {
    console.log("Test failed. Browser logs:");
    console.log(await t.getBrowserConsoleMessages());
  }
});
