import AutoLaunch from "auto-launch";
import { app } from "electron";
import electronIsDev from "electron-is-dev";

import settings from "./settings";

export async function updateAutoLaunch() {
    let isAutoLaunchEnabled = settings.get("auto_launch_enabled");

    // set default to enabled
    if (isAutoLaunchEnabled === undefined) {
        settings.set("auto_launch_enabled", true);
        isAutoLaunchEnabled = true;
    }

    // Don't run this in development
    if (electronIsDev) {
        return;
    }

    // `setLoginItemSettings` doesn't support linux
    if (process.platform === "linux") {
        const autoLauncher = new AutoLaunch({
            name: "WorkAdventure",
            isHidden: true,
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
        openAsHidden: true,
    });
}
