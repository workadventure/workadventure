import { app, dialog, Menu, type MenuItem, type MenuItemConstructorOptions, type MessageBoxOptions } from "electron";
import ElectronLog from "electron-log";

import { createWindow, getWindow, openWorldTab } from "./window";
import { getPinnedWorlds, getRecentWorlds, onWorldHistoryChange } from "./world-history";
import { closeActiveTab, closeInactiveTabs, cycleTab, getTabs } from "./tab-manager";
import { setTabStripVisible } from "./tab-strip";
import settings from "./settings";

/**
 * Toggle the tab bar from the menu. Electron flips `menuItem.checked` to the requested state BEFORE
 * calling this. Turning it off while several tabs are open would strand the background tabs (no
 * strip to switch/close them), so we confirm first and close all but the active one; cancelling
 * reverts the checkbox and keeps the bar visible.
 */
async function toggleTabBar(menuItem: MenuItem): Promise<void> {
    if (menuItem.checked) {
        settings.set("tab_bar_enabled", true);
        setTabStripVisible(true);
        return;
    }

    const openTabs = getTabs().length;
    if (openTabs > 1) {
        const others = openTabs - 1;
        const window = getWindow();
        const options: MessageBoxOptions = {
            type: "question",
            buttons: ["Cancel", `Close ${others} other tab${others > 1 ? "s" : ""} & hide bar`],
            defaultId: 1,
            cancelId: 0,
            title: "Hide the tab bar?",
            message: "Hide the tab bar?",
            detail: `You have ${openTabs} worlds open in tabs. Hiding the tab bar keeps the current world and closes the ${others} other${
                others > 1 ? "s" : ""
            }.`,
        };
        const { response } = window
            ? await dialog.showMessageBox(window, options)
            : await dialog.showMessageBox(options);
        if (response !== 1) {
            // Cancelled: revert the checkbox and leave the bar enabled.
            menuItem.checked = true;
            return;
        }
        closeInactiveTabs();
    }

    settings.set("tab_bar_enabled", false);
    setTabStripVisible(false);
}

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
                {
                    label: "Show tab bar",
                    type: "checkbox",
                    checked: settings.get("tab_bar_enabled") !== false,
                    click: (menuItem) => void toggleTabBar(menuItem),
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
