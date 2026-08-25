"use strict";

/**
 * The renderer settings every world view runs under. Extracted from tab-manager so the behavioural
 * probe in e2e/ exercises the very object the app ships, instead of a copy that could drift.
 *
 * `backgroundThrottling: false` is load-bearing, not a tweak. WorkAdventure's boot is driven by
 * Phaser's game loop, which runs on requestAnimationFrame, and Chromium schedules no frames for a
 * window it considers hidden. Measured on Electron 42 / macOS with a view hosted in a shell window
 * (the app's architecture): minimizing or hiding the shell drops the view to 0 frames with the
 * default, and keeps its full 60fps without throttling. Left throttled, a world loading while the
 * window is away never reaches the map — see world-view-policy.test.js and e2e/background-rendering.js.
 */
function createWorldViewWebPreferences(preloadPath) {
    return {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
        backgroundThrottling: false,
    };
}

module.exports = { createWorldViewWebPreferences };
