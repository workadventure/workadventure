import { BrowserWindow } from "electron";
import serve from "electron-serve";
import path from "path";

const customScheme = serve({ directory: path.resolve(__dirname, "..", "local-app", "dist") });

export async function loadCustomScheme(window: BrowserWindow) {
    await customScheme(window);
}
