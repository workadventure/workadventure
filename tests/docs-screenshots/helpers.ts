// Shared helpers for the documentation screenshot scripts (*.shots.ts).
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, dirname, extname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, expect } from "@playwright/test";
import type { APIRequestContext, Browser, Locator, Page } from "@playwright/test";
import { map_storage_url, play_url } from "../tests/utils/urls";

// Screenshots are written straight into docs/, at the path the Markdown references.
const DOCS_DIR = fileURLToPath(new URL("../../docs/", import.meta.url));

export type Clip = { x: number; y: number; width: number; height: number };

// Top of the screen (action bar + video tiles).
export const TOP: Clip = { x: 0, y: 0, width: 1280, height: 330 };

// Fresh map on every run, so settings start from scratch. Use a docs-<topic>/ path of your own:
// never another session's map or an E2E map.
export async function putMap(request: APIRequestContext, wam: string) {
    const response = await request.put(new URL(wam, map_storage_url).toString(), {
        multipart: {
            file: {
                name: basename(wam),
                mimeType: "application/json",
                buffer: Buffer.from(
                    JSON.stringify({
                        version: "1.0.0",
                        mapUrl: "http://maps.workadventure.localhost/starter/map.json",
                        areas: [],
                        entities: {},
                        entityCollections: [
                            {
                                url: "http://play.workadventure.localhost/collections/FurnitureCollection.json",
                                type: "file",
                            },
                            {
                                url: "http://play.workadventure.localhost/collections/OfficeCollection.json",
                                type: "file",
                            },
                        ],
                    }),
                ),
            },
        },
    });
    expect(response.ok()).toBeTruthy();
}

export async function newPage(browser: Browser): Promise<Page> {
    const context = await browser.newContext({
        permissions: ["microphone", "camera"],
        viewport: { width: 1280, height: 1080 },
        deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    await page.addLocatorHandler(page.getByTestId("onboarding-button-welcome-skip"), async () => {
        await page.getByTestId("onboarding-button-welcome-skip").click();
    });
    return page;
}

// Participant whose camera shows an image or a clip (never Chromium's green pattern).
// The Chromium flag applies to the whole browser: one browser per person. Close with page.context().browser()?.close().
export async function newCameraPage(cameraName: string): Promise<Page> {
    const browser = await chromium.launch({
        args: [
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            `--use-file-for-fake-video-capture=${camera(cameraName)}`,
        ],
    });
    return newPage(browser);
}

// Converts $WA_DOC_CAMERAS/<name> (a .png still or a .mp4 clip) to the .y4m Chromium needs (.mjpeg is ignored), once.
function camera(name: string): string {
    const dir = process.env.WA_DOC_CAMERAS;
    if (!dir) throw new Error("Set WA_DOC_CAMERAS to the folder holding the camera images");
    const y4m = join(tmpdir(), `wa-doc-${name}.y4m`);
    if (!existsSync(y4m)) {
        // A still needs a single frame: Chromium loops the file.
        const still = extname(name) === ".png" ? ["-frames:v", "1", "-vf", "scale=1280:720"] : [];
        execFileSync("ffmpeg", [
            "-y",
            "-loglevel",
            "error",
            "-i",
            join(dir, name),
            ...still,
            "-pix_fmt",
            "yuv420p",
            y4m,
        ]);
    }
    return y4m;
}

export async function enter(page: Page, wam: string, name: string) {
    await page.goto(new URL(`/~/${wam}`, play_url).toString());
    await page.getByTestId("loginSceneNameInput").fill(name);
    await page.getByTestId("loginSceneNameInput").press("Enter");
    await page.locator("button.selectCharacterSceneFormSubmit").click();
    await expect(page.locator("h2", { hasText: "Turn on your camera and microphone" })).toBeVisible();
    // We arrive with camera and microphone off: keep the camera off (no green fake camera in the docs).
    await page.locator("text=Save").click();
    await expect(page.getByTestId("microphone-button")).toBeVisible({ timeout: 120_000 });
}

// Numbered red badge, same style as the older doc screenshots.
export async function badgeAt(page: Page, x: number, y: number, n: number) {
    await page.evaluate(
        ({ x, y, n }) => {
            const d = document.createElement("div");
            d.className = "docs-badge";
            d.textContent = String(n);
            d.style.cssText = `position:fixed;left:${x - 18}px;top:${y - 18}px;width:36px;height:36px;z-index:2147483647;
                background:#fff;color:#e5352b;border:3px solid #e5352b;border-radius:9px;display:flex;
                align-items:center;justify-content:center;font:700 20px/1 Roboto,Arial,sans-serif;
                box-shadow:0 2px 6px rgba(0,0,0,.35);pointer-events:none;`;
            document.body.appendChild(d);
        },
        { x, y, n },
    );
}

// Top-left corner of the target, or centred below it (below = true, for an action bar button).
export async function badge(page: Page, target: Locator, n: number, below = false) {
    const box = await target.boundingBox();
    if (!box) throw new Error(`no box for badge ${n}`);
    await badgeAt(page, below ? box.x + box.width / 2 : box.x, below ? box.y + box.height + 4 : box.y, n);
}

// docsPath is relative to docs/, e.g. "map-building/images/editor/megaphone_menu.png".
export async function shot(page: Page, docsPath: string, clip?: Clip) {
    const file = join(DOCS_DIR, docsPath);
    mkdirSync(dirname(file), { recursive: true });
    await page.waitForTimeout(700);
    await page.screenshot({ path: file, clip });
    await page.evaluate(() => document.querySelectorAll(".docs-badge").forEach((e) => e.remove()));
}

export async function clipOf(target: Locator, margin = 0): Promise<Clip> {
    const box = await target.boundingBox();
    if (!box) throw new Error("no box for clip");
    return { x: box.x - margin, y: box.y - margin, width: box.width + 2 * margin, height: box.height + 2 * margin };
}

// Fallback when the play container cannot be recreated with DEBUG_MODE=false: hides the magenta boxes
// (Phaser physics debug) in this browser only. The game is not exposed on window; we import the app's
// GameManager module by its exact URL (with ?t=…), otherwise we get another instance.
// Call it once inside the map. Verified on 2026-10-02.
export async function hidePhysicsDebug(page: Page) {
    const result = await page.evaluate(async () => {
        const url = performance
            .getEntriesByType("resource")
            .map((e) => e.name)
            .find((n) => n.includes("/Phaser/Game/GameManager.ts"));
        if (!url) return "GameManager module not found";
        const { gameManager } = await import(/* @vite-ignore */ url);
        const world = gameManager.getCurrentGameScene().physics.world;
        world.drawDebug = false;
        world.debugGraphic?.clear();
        world.debugGraphic?.setVisible(false);
        return "hidden";
    });
    if (result !== "hidden") throw new Error(result);
}

// "No sound detected" can show up a few seconds after the microphone is turned on: close it in a loop.
export async function dismissToasts(...pages: Page[]) {
    for (let i = 0; i < 6; i++) {
        for (const page of pages) {
            const ignore = page.getByRole("button", { name: "Ignore" });
            if (await ignore.isVisible()) await ignore.click();
        }
        await pages[0].waitForTimeout(500);
    }
}

// The fake camera is named after the full .y4m path and the microphone "Fake Default Audio Input":
// rename the device selector options before the screenshot.
export async function renameFakeDevices(page: Page) {
    await page.evaluate(() => {
        document.querySelectorAll("select option").forEach((o) => {
            if (o.textContent?.includes(".y4m")) o.textContent = "HD Webcam";
            if (o.textContent?.includes("Fake Default Audio Input")) o.textContent = "Default microphone";
        });
    });
}
