import { expect, test } from "@playwright/test";
import { getPage } from "./utils/auth";
import { play_url, publicTestMapUrl } from "./utils/urls";

const MAP_URL = new URL(publicTestMapUrl("tests/E2E/empty.json", "accessibility"), play_url).toString();

// Accessible names are asserted as "not empty" rather than by text, so the test does not depend on the locale.
test.describe("Accessibility @nomobile", () => {
    test("the entry screens can be used with a keyboard and a screen reader", async ({ browser }) => {
        const context = await browser.newContext();
        const page = await context.newPage();
        await page.goto(MAP_URL);

        // The name field has a real label, and no error is shown or announced before the user types
        const nameInput = page.getByTestId("loginSceneNameInput");
        await expect(nameInput).toHaveAccessibleName(/.+/);
        await expect(nameInput).not.toHaveAttribute("aria-invalid", "true");
        await expect(page.locator("#loginSceneNameError")).toHaveCount(0);

        await nameInput.fill("Alice");
        await nameInput.press("Enter");

        // Every Woka choice is named and tells which one is selected
        const wokas = page.locator("[id^='woka-']");
        await expect(wokas.first()).toBeVisible();
        for (const woka of await wokas.all()) {
            await expect(woka).toHaveAccessibleName(/.+/);
            await expect(woka).toHaveAttribute("aria-pressed", /true|false/);
        }
        const second = wokas.nth(1);
        await second.focus();
        await page.keyboard.press("Space");
        await expect(second).toHaveAttribute("aria-pressed", "true");
        await expect(wokas.first()).toHaveAttribute("aria-pressed", "false");
        await context.close();
    });

    test("the action bar buttons are named and expose their on/off state", async ({ browser }) => {
        await using page = await getPage(browser, "Alice", MAP_URL);

        const buttons = page.getByTestId("action-bar").locator("button:visible");
        await expect(buttons.first()).toBeVisible();
        for (const button of await buttons.all()) {
            await expect(button).toHaveAccessibleName(/.+/);
        }

        // The microphone is a toggle: its state is exposed, not only its colour
        const microphone = page.getByTestId("microphone-button");
        const before = await microphone.getAttribute("aria-pressed");
        expect(before).toMatch(/true|false/);
        await microphone.focus();
        await page.keyboard.press("Space");
        await expect(microphone).toHaveAttribute("aria-pressed", before === "true" ? "false" : "true");
    });
});
