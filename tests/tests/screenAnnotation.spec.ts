import { expect, test, type Locator, type Page } from "@playwright/test";
import Map from "./utils/map";
import { publicTestMapUrl } from "./utils/urls";
import { getPage } from "./utils/auth";
import Menu from "./utils/menu";

/**
 * Draw a single freehand stroke on the given annotation canvas, in its upper area so the
 * gesture does not land on the toolbar (which sits at the bottom-center of the canvas).
 */
async function drawStroke(page: Page, canvas: Locator): Promise<void> {
    const box = await canvas.boundingBox();
    if (!box) {
        throw new Error("annotation canvas has no bounding box");
    }
    const startX = box.x + box.width * 0.3;
    const startY = box.y + box.height * 0.25;
    const endX = box.x + box.width * 0.7;
    const endY = box.y + box.height * 0.45;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move((startX + endX) / 2, (startY + endY) / 2, { steps: 5 });
    await page.mouse.move(endX, endY, { steps: 5 });
    await page.mouse.up();
}

test.describe("Screen-sharing annotation @nomobile @nowebkit @nofirefox", () => {
    test("Annotations drawn on a shared screen are synchronized between participants", async ({ browser }) => {
        // Alice and Bob join the same proximity bubble.
        await using alice = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "screenAnnotation"),
        );
        await Map.teleportToPosition(alice, 160, 160);

        await using bob = await getPage(browser, "Bob", publicTestMapUrl("tests/E2E/empty.json", "screenAnnotation"));
        await Map.teleportToPosition(bob, 160, 160);

        await expect(alice.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });

        // Alice shares her screen; Bob automatically sees it enlarged.
        await alice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(alice, "screenShareButton", "active");
        await expect(bob.locator("#highlighted-media").getByText("Alice")).toBeVisible({ timeout: 30_000 });

        // Alice clicks the pencil on her shared-screen tile: this enlarges the screen AND enters
        // drawing mode in a single click.
        await alice.getByTestId("screenshare-annotate-button").click();

        const aliceCanvas = alice.locator("#highlighted-media").getByTestId("annotation-canvas");
        const bobCanvas = bob.locator("#highlighted-media").getByTestId("annotation-canvas");
        await expect(aliceCanvas).toBeVisible();
        await expect(bobCanvas).toBeVisible();

        // The presenter always has the annotation toolbar; the viewer does not yet.
        await expect(alice.getByTestId("annotation-toolbar")).toBeVisible();
        await expect(bob.getByTestId("annotation-toggle")).toHaveCount(0);

        // Alice draws one stroke (drawing mode is already active from the pencil button).
        await alice.getByTestId("annotation-tool-pen").click();
        await drawStroke(alice, aliceCanvas);

        // The stroke is committed locally and synchronized to Bob (even though Bob cannot draw yet).
        await expect(aliceCanvas).toHaveAttribute("data-element-count", "1");
        await expect(bobCanvas).toHaveAttribute("data-element-count", "1", { timeout: 15_000 });

        // Alice allows everybody to annotate: Bob's toolbar appears.
        await alice.getByTestId("annotation-allow-toggle").click();
        await expect(bob.getByTestId("annotation-toggle")).toBeVisible({ timeout: 15_000 });

        // Bob draws a second stroke; both participants see two elements.
        await bob.getByTestId("annotation-toggle").click();
        await bob.getByTestId("annotation-tool-arrow").click();
        await drawStroke(bob, bobCanvas);

        await expect(bobCanvas).toHaveAttribute("data-element-count", "2");
        await expect(aliceCanvas).toHaveAttribute("data-element-count", "2", { timeout: 15_000 });

        // The presenter clears everything.
        await alice.getByTestId("annotation-clear-all").click();
        await expect(aliceCanvas).toHaveAttribute("data-element-count", "0");
        await expect(bobCanvas).toHaveAttribute("data-element-count", "0", { timeout: 15_000 });

        // Draw again, then stop the screen share: annotations must be dropped on both sides.
        await drawStroke(alice, aliceCanvas);
        await expect(bobCanvas).toHaveAttribute("data-element-count", "1", { timeout: 15_000 });

        await alice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(alice, "screenShareButton", "normal");

        // Bob no longer sees Alice's shared screen (and therefore no annotation canvas).
        await expect(bob.locator("#highlighted-media").getByText("Alice")).toHaveCount(0);

        // If Alice re-shares, the previous annotations are gone (cleared on stop).
        await alice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(alice, "screenShareButton", "active");
        await alice.getByTestId("screenshare-fullscreen-button").click();
        await expect(alice.locator("#highlighted-media").getByTestId("annotation-canvas")).toHaveAttribute(
            "data-element-count",
            "0",
        );
    });
});
