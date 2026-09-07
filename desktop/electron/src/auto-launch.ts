import AutoLaunch from "auto-launch";
import { app } from "electron";
import electronIsDev from "electron-is-dev";

import settings from "./settings";

export async function updateAutoLaunch() {
    const isAutoLaunchEnabled = settings.get("auto_launch_enabled");

    // Don't run this in development
    if (electronIsDev) {
        return;
    }

    // Deliberately NOT a hidden start (no `isHidden` / `openAsHidden`). Two reasons, and the second
    // is the blocking one:
    //
    // Nothing reads `wasOpenedAsHidden`, so the shell shows and focuses the window anyway — the
    // setting promised a behaviour the app does not implement.
    //
    // And implementing it would not work today. `openAsHidden` on macOS hides the *application*,
    // and a hidden app gets no animation frames; WorkAdventure's boot runs on Phaser's game loop,
    // so it would freeze mid-way and never reach the map. (A window merely created unshown is fine
    // — Chromium still renders it — but that is not what a login item does.) Reaching a world in
    // the background needs the connection taken out of the render loop, on the front side.

    // `setLoginItemSettings` doesn't support linux
    if (process.platform === "linux") {
        const autoLauncher = new AutoLaunch({
            name: "WorkAdventure",
        });

        if (isAutoLaunchEnabled) {
            await autoLauncher.enable();
        } else {
            await autoLauncher.disable();
        }

        return;
    }

    app.setLoginItemSettings({
        openAtLogin: isAutoLaunchEnabled,
    });
}
