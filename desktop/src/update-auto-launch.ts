import AutoLaunch from "auto-launch";
import * as isDev from "electron-is-dev";
import { app } from "electron";

import settings from "./settings";

export default async () => {
    let isAutoLaunchEnabled = settings.get("auto_launch_enabled");

    // set default to enabled
    if (isAutoLaunchEnabled === null) {
        settings.set("auto_launch_enabled", true);
        isAutoLaunchEnabled = true;
    }

    // Don't run this in development
    if (isDev) {
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
};
