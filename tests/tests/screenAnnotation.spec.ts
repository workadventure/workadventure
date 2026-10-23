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

        // Park the pointer away from the action bar first. Clicking a bar button leaves the mouse
        // sitting on it, which keeps its hover help tooltip open (ActionBarButton opens it on
        // mouseenter and only closes it on mouseleave). That tooltip is z-500 and overlaps the
        // shared-screen tile, so it swallows the click below — and Playwright's retry loop never
        // moves the mouse, so it never clears: the click times out every single run.
        await alice.mouse.move(300, 300);

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

    test("A viewer never stays stuck in drawing mode", async ({ browser }) => {
        await using alice = await getPage(
            browser,
            "Alice",
            publicTestMapUrl("tests/E2E/empty.json", "screenAnnotationExit"),
        );
        await Map.teleportToPosition(alice, 160, 160);

        await using bob = await getPage(
            browser,
            "Bob",
            publicTestMapUrl("tests/E2E/empty.json", "screenAnnotationExit"),
        );
        await Map.teleportToPosition(bob, 160, 160);

        await expect(alice.locator("#cameras-container").getByText("You")).toBeVisible({ timeout: 30_000 });

        await alice.getByTestId("screenShareButton").click();
        await Menu.expectButtonState(alice, "screenShareButton", "active");
        await expect(bob.locator("#highlighted-media").getByText("Alice")).toBeVisible({ timeout: 30_000 });
        // See the first test: the action bar tooltip would swallow the click.
        await alice.mouse.move(300, 300);
        await alice.getByTestId("screenshare-annotate-button").click();
        await alice.getByTestId("annotation-allow-toggle").click();

        // Bob draws: the canvas takes his clicks.
        const bobCanvas = bob.locator("#highlighted-media").getByTestId("annotation-canvas");
        await bob.getByTestId("annotation-toggle").click({ timeout: 15_000 });
        await expect(bobCanvas).toHaveCSS("pointer-events", "auto");
        await drawStroke(bob, bobCanvas);
        await expect(bobCanvas).toHaveAttribute("data-element-count", "1");

        // Alice stops letting the others draw: Bob is out of drawing mode, the page takes his clicks again...
        await alice.getByTestId("annotation-allow-toggle").click();
        await expect(bob.getByTestId("annotation-toggle")).toHaveCount(0, { timeout: 15_000 });
        await expect(bobCanvas).toHaveCSS("pointer-events", "none");

        // ...and stays out of it when she lets them draw again.
        await alice.getByTestId("annotation-allow-toggle").click();
        await expect(bob.getByTestId("annotation-toggle")).toBeVisible({ timeout: 15_000 });
        await expect(bobCanvas).toHaveCSS("pointer-events", "none");

        // Escape leaves drawing mode.
        await bob.getByTestId("annotation-toggle").click();
        await expect(bobCanvas).toHaveCSS("pointer-events", "auto");
        await bob.keyboard.press("Escape");
        await expect(bobCanvas).toHaveCSS("pointer-events", "none");

        // Alice stops sharing while Bob draws: the shared screen, its canvas and its toolbar go away.
        await bob.getByTestId("annotation-toggle").click();
        await expect(bobCanvas).toHaveCSS("pointer-events", "auto");
        await alice.getByTestId("screenShareButton").click();
        await expect(bob.locator("#highlighted-media").getByText("Alice")).toHaveCount(0, { timeout: 15_000 });
        await expect(bob.getByTestId("annotation-canvas")).toHaveCount(0);
        await expect(bob.getByTestId("annotation-toolbar")).toHaveCount(0);
    });
});
