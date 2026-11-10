"use strict";

/**
 * The renderer settings every world view runs under. Extracted from tab-manager so the hardened
 * flags below sit in one testable place instead of inline in the view factory.
 *
 * Background throttling is deliberately left at Chromium's default (throttled). Disabling it does
 * keep a world loading while the shell window is minimized or hidden — measured on Electron 42 /
 * macOS, 0 frames throttled vs a full 60fps unthrottled — but per Electron's docs a single
 * unthrottled webContents unthrottles the whole window, so every open tab would keep its Phaser
 * loop running whenever the window is away. That is a permanent CPU and battery cost on every user
 * to fix a load-time case.
 *
 * The real cause is that WorkAdventure's boot is driven by Phaser's game loop (requestAnimationFrame),
 * so nothing — not even opening the room WebSocket — happens while the renderer gets no frames. The
 * fix belongs in the front: take the connection out of the render loop. Tracked separately.
 */
function createWorldViewWebPreferences(preloadPath) {
    return {
        preload: preloadPath,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: true,
        webSecurity: true,
    };
}

module.exports = { createWorldViewWebPreferences };
