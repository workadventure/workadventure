"use strict";

/**
 * Certifies the property the desktop app depends on: a world view keeps receiving animation frames
 * while the shell window is off screen. WorkAdventure's boot runs on Phaser's requestAnimationFrame
 * loop, so a view that stops getting frames never reaches the map — it strands the user on a
 * loading screen that cannot finish.
 *
 * Runs as a plain Electron script, NOT under Playwright. Playwright launches Electron with
 * anti-throttling switches (--disable-renderer-backgrounding and friends) that suppress the very
 * behaviour under test: the same assertions pass there whether or not the app disables background
 * throttling, which makes a Playwright version of this test worthless. Verified: with the flag
 * removed from world-view-policy, this script fails and the Playwright one did not.
 *
 * Uses hide(), not minimize(): a user minimizes, but that is the window manager's job and CI runs
 * under Xvfb with no window manager. hide() drives the same Chromium visibility change directly, so
 * the test means the same thing on a laptop and on a headless runner.
 *
 * Exercises the app's own webPreferences (world-view-policy) so it cannot drift from what ships.
 */

const path = require("path");
const { app, BrowserWindow, WebContentsView } = require("electron");
const { createWorldViewWebPreferences } = require("../src/world-view-policy");

const SAMPLE_MS = 2500;
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const failures = [];

async function waitForVisibility(contents, expected, timeoutMs) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const state = await contents.executeJavaScript("document.visibilityState");
        if (state === expected) {
            return true;
        }
        await wait(200);
    }
    return false;
}

function report(label, frames, visibility, expectRendering) {
    const rendering = frames > 0;
    const ok = rendering === expectRendering;
    console.log(
        `  ${ok ? "PASS" : "FAIL"}  ${label.padEnd(22)} frames=${String(frames).padStart(4)}  visibility=${visibility}`
    );
    if (!ok) {
        failures.push(
            `${label}: expected the view ${expectRendering ? "to keep rendering" : "not to render"}, got ${frames} frames`
        );
    }
}

app.whenReady().then(async () => {
    const shell = new BrowserWindow({ show: false, width: 500, height: 340 });
    const view = new WebContentsView({
        webPreferences: createWorldViewWebPreferences(
            path.join(__dirname, "..", "dist", "preload-app", "preload.js")
        ),
    });
    shell.contentView.addChildView(view);
    view.setBounds({ x: 0, y: 0, width: 500, height: 340 });
    await view.webContents.loadFile(path.join(__dirname, "frame-counter.html"));
    shell.show();

    // Wait for the view to actually be on screen before the baseline. Right after show() it can
    // still report itself hidden for a beat, and a baseline taken then would be measuring the very
    // state the test is about — the run would either fail for the wrong reason or, worse, pass one.
    const settled = await waitForVisibility(view.webContents, "visible", 5000);
    if (!settled) {
        console.error("La vue n'est jamais devenue visible — environnement sans affichage ?");
        app.exit(2);
        return;
    }

    const measure = async (label, expectRendering) => {
        const read = () => view.webContents.executeJavaScript("({f:window.__frames,v:document.visibilityState})");
        const before = await read();
        await wait(SAMPLE_MS);
        const after = await read();
        report(label, after.f - before.f, after.v, expectRendering);
    };

    // Baseline first: a view that never renders would "pass" the hidden case for the wrong reason.
    await measure("shell visible", true);

    shell.hide();
    await wait(800);
    await measure("shell caché", true);

    shell.show();
    await wait(800);
    await measure("shell restauré", true);

    shell.destroy();

    if (failures.length > 0) {
        console.error("\nÉCHEC — le monde cesse de tourner quand la fenêtre est masquée :");
        for (const failure of failures) {
            console.error(`  - ${failure}`);
        }
        console.error("\nVérifier `backgroundThrottling: false` dans src/world-view-policy.js.");
        app.exit(1);
        return;
    }

    console.log("\nOK — la vue monde continue de tourner fenêtre masquée.");
    app.exit(0);
});
