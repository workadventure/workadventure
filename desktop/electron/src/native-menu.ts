import { app, Menu, type MenuItemConstructorOptions } from "electron";
import ElectronLog from "electron-log";

import { createWindow, getWindow, openWorldTab } from "./window";
import { getPinnedWorlds, getRecentWorlds, onWorldHistoryChange } from "./world-history";
import { closeActiveTab, cycleTab } from "./tab-manager";

let isListeningForHistoryChanges = false;

function openNativeWorld(url: string): void {
    void (async () => {
        if (!getWindow()) {
            await createWindow(url);
            return;
        }
        // Recent / pinned worlds open in a new tab so they never replace what the user is in.
        await openWorldTab(url);
    })().catch((error) => {
        ElectronLog.error(`Failed to open recent world "${url}".`, error);
    });
}

export function createRecentWorldMenuItems(): MenuItemConstructorOptions[] {
    const recentWorlds = getRecentWorlds();
    if (recentWorlds.length === 0) {
        return [{ label: "No recent worlds", enabled: false }];
    }

    return recentWorlds.map((world) => ({
        label: world.label,
        toolTip: world.url,
        click: () => openNativeWorld(world.url),
    }));
}

export function createPinnedWorldMenuItems(): MenuItemConstructorOptions[] {
    const pinnedWorlds = getPinnedWorlds();
    if (pinnedWorlds.length === 0) {
        return [{ label: "No pinned worlds", enabled: false }];
    }

    return pinnedWorlds.map((world) => ({
        label: world.label,
        toolTip: world.url,
        click: () => openNativeWorld(world.url),
    }));
}

export function openNativeWorldSwitcher(): void {
    void (async () => {
        if (!getWindow()) {
            await createWindow();
            return;
        }
        // Open the Landing in a new tab rather than replacing the world the user is in.
        await openWorldTab();
    })().catch((error) => {
        ElectronLog.error("Failed to open the native world switcher.", error);
    });
}

export function createNativeApplicationMenu(): void {
    const template: MenuItemConstructorOptions[] = [
        ...(process.platform === "darwin"
            ? [
                  {
                      label: app.name,
                      submenu: [
                          { role: "about" as const },
                          { type: "separator" as const },
                          { role: "services" as const },
                          { type: "separator" as const },
                          { role: "hide" as const },
                          { role: "hideOthers" as const },
                          { role: "unhide" as const },
                          { type: "separator" as const },
                          { role: "quit" as const },
                      ],
                  },
              ]
            : []),
        {
            label: "World",
            submenu: [
                {
                    label: "New tab",
                    accelerator: "CmdOrCtrl+T",
                    click: () => void openWorldTab(),
                },
                {
                    label: "Close tab",
                    accelerator: "CmdOrCtrl+W",
                    click: closeActiveTab,
                },
                {
                    label: "Next tab",
                    accelerator: "CmdOrCtrl+Shift+]",
                    click: () => cycleTab(1),
                },
                {
                    label: "Previous tab",
                    accelerator: "CmdOrCtrl+Shift+[",
                    click: () => cycleTab(-1),
                },
                { type: "separator" },
                {
                    label: "Change world…",
                    accelerator: "CmdOrCtrl+Shift+O",
                    click: openNativeWorldSwitcher,
                },
                {
                    label: "Pinned worlds",
                    submenu: createPinnedWorldMenuItems(),
                },
                {
                    label: "Recent worlds",
                    submenu: createRecentWorldMenuItems(),
                },
                ...(process.platform === "darwin"
                    ? []
                    : ([{ type: "separator" }, { role: "quit" }] as MenuItemConstructorOptions[])),
            ],
        },
        { role: "editMenu" },
        { role: "windowMenu" },
    ];

    Menu.setApplicationMenu(Menu.buildFromTemplate(template));
    if (!isListeningForHistoryChanges) {
        isListeningForHistoryChanges = true;
        onWorldHistoryChange(createNativeApplicationMenu);
    }
}
