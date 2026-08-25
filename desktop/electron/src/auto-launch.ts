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

    // Deliberately NOT a hidden start (no `isHidden` / `openAsHidden`). Nothing reads
    // `wasOpenedAsHidden`, so the shell would show the window anyway — and if it did stay hidden,
    // Chromium schedules no requestAnimationFrame for a hidden window, which freezes the Phaser
    // boot loop: the world would never connect, it would sit on its loading screen until the window
    // is revealed. A visible launch is the only mode that actually reaches the world.

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
