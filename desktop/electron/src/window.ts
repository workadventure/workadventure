import { BrowserWindow, app, net, shell, session } from "electron";
import ElectronLog from "electron-log";
import http from "http";
import windowStateKeeper from "electron-window-state";
import path from "path";
import settings from "./settings";
import { createDesktopAuthWindowOptions, isExpectedDesktopAuthWindowLoadError } from "./desktop-auth-window-policy";
import { createDesktopCallbackPage } from "./desktop-callback-page";
import { createDesktopWindowTitle } from "./app-name-policy";
import { createDesktopWindowState, type DesktopWindowState } from "./desktop-window-state-policy";
import {
    createDesktopConfig,
    createDesktopLoginUrl,
    createDesktopLogoutUrl,
    createRoomUrlWithAuthToken,
    isAllowedNavigationUrl,
    isDesktopLoginUrl,
    isDesktopLogoutUrl,
    isRoomUrl,
    resolveInitialTarget,
    type DesktopAuthCallback,
    type DesktopConfig,
} from "./desktop-url-policy";
import { shouldMaximizeBeforeLoad } from "./window-state-policy";

let mainWindow: BrowserWindow | undefined;
let pendingDeepLinkUrl: string | undefined;
let desktopAuthCallbackServer: http.Server | undefined;
let desktopCallbackServerOrigin: string | undefined;
let desktopAuthWindow: BrowserWindow | undefined;

export function getWindow() {
    return mainWindow;
}

export function getDesktopWindowState(): DesktopWindowState {
    return createDesktopWindowState(mainWindow);
}

function emitDesktopWindowStateChange() {
    if (!mainWindow || mainWindow.webContents.isDestroyed()) {
        return;
    }

    mainWindow.webContents.send("app:on-window-state-change", getDesktopWindowState());
}

function getDesktopConfig(): DesktopConfig {
    return createDesktopConfig({
        ...process.env,
        portalUrl: settings.get("portal_url"),
    });
}

function showWindow() {
    if (!mainWindow) {
        return;
    }

    if (mainWindow.isMinimized()) {
        mainWindow.restore();
    }

    mainWindow.show();
    mainWindow.focus();
    refreshRendererViewport("show");
}

function refreshRendererViewport(reason: string) {
    if (!mainWindow || mainWindow.webContents.isDestroyed()) {
        return;
    }

    const dispatchResize = () => {
        if (!mainWindow || mainWindow.webContents.isDestroyed()) {
            return;
        }

        void mainWindow.webContents
            .executeJavaScript(
                `requestAnimationFrame(() => {
                    window.dispatchEvent(new Event("resize"));
                    requestAnimationFrame(() => window.dispatchEvent(new Event("resize")));
                });`,
                true
            )
            .catch((error) => {
                ElectronLog.debug(`Could not refresh renderer viewport after ${reason}.`, error);
            });
    };

    dispatchResize();
    setTimeout(dispatchResize, 100);
}

function shouldOpenExternally(url: string, config: DesktopConfig) {
    return !isAllowedNavigationUrl(url, config);
}

async function openExternal(url: string) {
    const protocol = new URL(url).protocol;
    if (!["http:", "https:", "mailto:", "workadventure:"].includes(protocol)) {
        return;
    }

    await shell.openExternal(url);
}

function escapeHtml(value: string) {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

async function showDesktopBrowserFlowPendingScreen(title: string, message: string, actionUrl: string) {
    if (!mainWindow) {
        return;
    }

    const safeActionUrl = escapeHtml(actionUrl);
    const safeTitle = escapeHtml(title);
    const safeMessage = escapeHtml(message);
    const html = `<!doctype html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Connexion WorkAdventure</title>
  <style>
    html, body { height: 100%; margin: 0; }
    body {
      display: grid;
      place-items: center;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #f8fafc;
      background: #111827;
    }
    main { width: min(520px, calc(100vw - 48px)); }
    h1 { margin: 0 0 12px; font-size: 28px; font-weight: 700; letter-spacing: 0; }
    p { margin: 0 0 22px; color: #cbd5e1; line-height: 1.5; }
    a {
      display: inline-block;
      border-radius: 8px;
      padding: 12px 16px;
      background: #4353ff;
      color: white;
      text-decoration: none;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <main>
    <h1>${safeTitle}</h1>
    <p>${safeMessage}</p>
    <a href="${safeActionUrl}">Rouvrir le navigateur</a>
  </main>
</body>
</html>`;

    await mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
    showWindow();
}

async function openDesktopLogin(url: string) {
    const callbackOrigin = await ensureDesktopCallbackServer();
    const desktopLoginUrl = createDesktopLoginUrl(url, `${callbackOrigin}/auth/callback`);
    await openDesktopAuthWindow(desktopLoginUrl);
    if (!hasDesktopAuthWindow()) {
        return;
    }

    await showDesktopBrowserFlowPendingScreen(
        "Connexion en cours...",
        "Terminez l'identification dans votre navigateur. WorkAdventure reviendra automatiquement dans cette fenêtre.",
        desktopLoginUrl
    );
}

async function openDesktopLogout(url: string) {
    const callbackOrigin = await ensureDesktopCallbackServer();
    const desktopLogoutUrl = createDesktopLogoutUrl(url, `${callbackOrigin}/logout/callback`);
    await openDesktopAuthWindow(desktopLogoutUrl);
    if (!hasDesktopAuthWindow()) {
        return;
    }

    await showDesktopBrowserFlowPendingScreen(
        "Déconnexion en cours...",
        "Terminez la déconnexion dans votre navigateur. WorkAdventure reviendra automatiquement dans cette fenêtre.",
        desktopLogoutUrl
    );
}

function isAllowedDesktopBrowserFlowUrl(url: string, config: DesktopConfig) {
    return isAllowedNavigationUrl(url, config) && (isDesktopLoginUrl(url) || isDesktopLogoutUrl(url));
}

async function openDesktopBrowserFlow(url: string) {
    if (isDesktopLoginUrl(url)) {
        await openDesktopLogin(url);
        return;
    }

    await openDesktopLogout(url);
}

async function openDesktopAuthWindow(url: string) {
    if (desktopAuthWindow && !desktopAuthWindow.isDestroyed()) {
        await loadDesktopAuthWindowUrl(url);
        desktopAuthWindow.show();
        desktopAuthWindow.focus();
        return;
    }

    desktopAuthWindow = new BrowserWindow({
        ...createDesktopAuthWindowOptions(),
        parent: mainWindow,
    });
    desktopAuthWindow.setMenu(null);
    desktopAuthWindow.on("closed", () => {
        desktopAuthWindow = undefined;
    });
    desktopAuthWindow.webContents.setWindowOpenHandler(({ url: popupUrl }) => {
        void loadDesktopAuthWindowUrl(popupUrl);
        return { action: "deny" };
    });
    await loadDesktopAuthWindowUrl(url);
}

function hasDesktopAuthWindow() {
    return Boolean(desktopAuthWindow && !desktopAuthWindow.isDestroyed());
}

async function loadDesktopAuthWindowUrl(url: string) {
    try {
        await desktopAuthWindow?.loadURL(url);
    } catch (error) {
        if (isExpectedDesktopAuthWindowLoadError(error) && !hasDesktopAuthWindow()) {
            ElectronLog.debug(`Ignored desktop auth window load cancellation for "${url}".`, error);
            return;
        }

        throw error;
    }
}

function closeDesktopAuthWindow() {
    if (!desktopAuthWindow || desktopAuthWindow.isDestroyed()) {
        return;
    }

    desktopAuthWindow.close();
    desktopAuthWindow = undefined;
}

function ensureDesktopCallbackServer(): Promise<string> {
    if (desktopCallbackServerOrigin) {
        return Promise.resolve(desktopCallbackServerOrigin);
    }

    desktopAuthCallbackServer = http.createServer((request, response) => {
        const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
        if (requestUrl.pathname !== "/auth/callback" && requestUrl.pathname !== "/logout/callback") {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }

        if (requestUrl.pathname === "/logout/callback") {
            const targetUrl = requestUrl.searchParams.get("url");
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.end(createDesktopCallbackPage("Déconnexion terminée. Vous pouvez revenir dans WorkAdventure."));

            closeDesktopAuthWindow();
            void loadDesktopTarget(targetUrl || getDesktopConfig().portalUrl);
            return;
        }

        const origin = requestUrl.searchParams.get("origin");
        const code = requestUrl.searchParams.get("code");
        if (!origin || !code) {
            response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Missing desktop auth callback parameters");
            return;
        }

        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(createDesktopCallbackPage("Connexion terminée. Vous pouvez revenir dans WorkAdventure."));

        closeDesktopAuthWindow();
        void openDesktopAuthCallback({ origin, code });
    });

    return new Promise((resolve, reject) => {
        if (!desktopAuthCallbackServer) {
            reject(new Error("Desktop auth callback server was not created"));
            return;
        }

        desktopAuthCallbackServer.on("error", reject);
        desktopAuthCallbackServer.listen(0, "127.0.0.1", () => {
            const address = desktopAuthCallbackServer?.address();
            if (!address || typeof address === "string") {
                reject(new Error("Desktop auth callback server did not expose a TCP address"));
                return;
            }

            desktopCallbackServerOrigin = `http://127.0.0.1:${address.port}`;
            ElectronLog.info(`Desktop callback server listening on ${desktopCallbackServerOrigin}`);
            resolve(desktopCallbackServerOrigin);
        });
    });
}

function rememberRoomUrl(url: string) {
    if (isRoomUrl(url)) {
        settings.set("last_room_url", url);
    }
}

function configureSession(config: DesktopConfig) {
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback, details) => {
        const requestingUrl = details.requestingUrl || webContents.getURL();
        const allowedPermissions = new Set(["media", "display-capture", "notifications", "fullscreen"]);
        callback(allowedPermissions.has(permission) && isAllowedNavigationUrl(requestingUrl, config));
    });
}

function configureNavigationSecurity(window: BrowserWindow, config: DesktopConfig) {
    window.webContents.setWindowOpenHandler(({ url }) => {
        if (isAllowedDesktopBrowserFlowUrl(url, config)) {
            void openDesktopBrowserFlow(url);
            return { action: "deny" };
        }

        if (shouldOpenExternally(url, config)) {
            void openExternal(url);
            return { action: "deny" };
        }

        void loadDesktopTarget(url);
        return { action: "deny" };
    });

    window.webContents.on("will-navigate", (event, url) => {
        if (isAllowedDesktopBrowserFlowUrl(url, config)) {
            event.preventDefault();
            void openDesktopBrowserFlow(url);
            return;
        }

        if (shouldOpenExternally(url, config)) {
            event.preventDefault();
            void openExternal(url);
        }
    });

    window.webContents.on("will-redirect", (event, url) => {
        if (isAllowedDesktopBrowserFlowUrl(url, config)) {
            event.preventDefault();
            void openDesktopBrowserFlow(url);
            return;
        }

        if (shouldOpenExternally(url, config)) {
            event.preventDefault();
            void openExternal(url);
        }
    });

    window.webContents.on("did-navigate", (event, url) => {
        rememberRoomUrl(url);
    });

    window.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
        const portalUrl = getDesktopConfig().portalUrl;
        if (validatedURL && validatedURL !== portalUrl) {
            void loadDesktopTarget(portalUrl);
        }
    });
}

export async function createWindow(initialUrl?: string) {
    // do not re-create window if still existing
    if (mainWindow) {
        if (initialUrl) {
            await loadDesktopTarget(initialUrl);
        }
        showWindow();
        return;
    }

    const config = getDesktopConfig();
    configureSession(config);

    // Load the previous state with fallback to defaults
    const windowState = windowStateKeeper({
        defaultWidth: 1000,
        defaultHeight: 800,
        maximize: true,
    });
    const maximizeBeforeLoad = shouldMaximizeBeforeLoad(windowState);

    mainWindow = new BrowserWindow({
        x: windowState.x,
        y: windowState.y,
        width: windowState.width,
        height: windowState.height,
        autoHideMenuBar: true,
        show: false,
        webPreferences: {
            preload: path.resolve(__dirname, "..", "dist", "preload-app", "preload.js"),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
        },
    });
    mainWindow.setMenu(null);
    configureNavigationSecurity(mainWindow, config);

    // Let us register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    windowState.manage(mainWindow);
    if (maximizeBeforeLoad && !mainWindow.isMaximized() && !mainWindow.isFullScreen()) {
        mainWindow.maximize();
    }

    mainWindow.on("closed", () => {
        mainWindow = undefined;
    });

    mainWindow.on("resize", () => refreshRendererViewport("resize"));
    mainWindow.on("maximize", () => refreshRendererViewport("maximize"));
    mainWindow.on("unmaximize", () => refreshRendererViewport("unmaximize"));
    mainWindow.on("restore", () => refreshRendererViewport("restore"));
    mainWindow.on("enter-full-screen", () => refreshRendererViewport("enter-full-screen"));
    mainWindow.on("leave-full-screen", () => refreshRendererViewport("leave-full-screen"));
    mainWindow.on("focus", emitDesktopWindowStateChange);
    mainWindow.on("blur", emitDesktopWindowStateChange);
    mainWindow.on("show", emitDesktopWindowStateChange);
    mainWindow.on("hide", emitDesktopWindowStateChange);
    mainWindow.on("minimize", emitDesktopWindowStateChange);
    mainWindow.on("restore", emitDesktopWindowStateChange);

    // mainWindow.on('close', async (event) => {
    //   if (!app.confirmedExitPrompt) {
    //     event.preventDefault(); // Prevents the window from closing
    //     const choice = await dialog.showMessageBox(getMainWindow(), {
    //       type: 'question',
    //       buttons: ['Yes', 'Abort'],
    //       title: 'Confirm',
    //       message: 'Are you sure you want to quit?',
    //     });
    //     if (choice.response === 0) {
    //       app.confirmedExitPrompt = true;
    //       mainWindow.close();
    //     }
    //   } else {
    //     app.confirmedExitPrompt = false;
    //   }
    // });

    mainWindow.once("ready-to-show", () => {
        mainWindow?.show();
    });

    mainWindow.webContents.on("did-finish-load", () => {
        mainWindow?.setTitle(createDesktopWindowTitle());
        refreshRendererViewport("did-finish-load");
    });

    await loadDesktopTarget(initialUrl);
}

export async function loadDesktopTarget(requestedUrl?: string) {
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    const config = getDesktopConfig();
    const target = resolveInitialTarget(config, {
        pendingDeepLinkUrl: requestedUrl || pendingDeepLinkUrl,
        lastRoomUrl: settings.get("last_room_url"),
    });
    pendingDeepLinkUrl = undefined;
    try {
        await mainWindow.loadURL(target);
    } catch (error) {
        const portalUrl = getDesktopConfig().portalUrl;
        ElectronLog.warn(`Failed to load desktop target "${target}".`, error);

        if (target !== portalUrl) {
            try {
                await mainWindow.loadURL(portalUrl);
            } catch (fallbackError) {
                ElectronLog.error(`Failed to load fallback portal "${portalUrl}".`, fallbackError);
            }
        }
    }
    showWindow();
}

function requestDesktopAuthExchange(origin: string, code: string): Promise<{ token: string; targetUrl: string }> {
    return new Promise((resolve, reject) => {
        const exchangeUrl = new URL("/desktop-auth/exchange", origin).toString();
        const body = JSON.stringify({ code });
        const request = net.request({
            method: "POST",
            url: exchangeUrl,
        });
        let responseBody = "";

        request.setHeader("Content-Type", "application/json");
        request.setHeader("Accept", "application/json");
        request.on("response", (response) => {
            response.on("data", (chunk) => {
                responseBody += chunk.toString();
            });
            response.on("end", () => {
                if (response.statusCode === undefined || response.statusCode < 200 || response.statusCode >= 300) {
                    reject(new Error(`Desktop auth exchange failed with status ${response.statusCode ?? "unknown"}`));
                    return;
                }

                try {
                    const payload = JSON.parse(responseBody) as Partial<{ token: string; targetUrl: string }>;
                    if (typeof payload.token !== "string" || typeof payload.targetUrl !== "string") {
                        reject(new Error("Desktop auth exchange returned an invalid payload"));
                        return;
                    }

                    resolve({
                        token: payload.token,
                        targetUrl: payload.targetUrl,
                    });
                } catch (error) {
                    reject(error);
                }
            });
            response.on("error", reject);
        });
        request.on("error", reject);
        request.write(body);
        request.end();
    });
}

async function openDesktopAuthCallback(callback: DesktopAuthCallback) {
    const config = getDesktopConfig();
    if (!isAllowedNavigationUrl(callback.origin, config)) {
        ElectronLog.warn(`Blocked desktop auth callback from disallowed origin "${callback.origin}".`);
        await createWindow();
        return;
    }

    if (!mainWindow) {
        await createWindow();
    }

    try {
        const payload = await requestDesktopAuthExchange(callback.origin, callback.code);
        await loadDesktopTarget(createRoomUrlWithAuthToken(payload.targetUrl, payload.token));
    } catch (error) {
        ElectronLog.warn("Failed to exchange desktop auth callback.", error);
        await loadDesktopTarget(getDesktopConfig().portalUrl);
    }
}

export async function openDeepLinkTarget(target?: string | DesktopAuthCallback) {
    if (!target) {
        await createWindow();
        return;
    }

    if (typeof target !== "string") {
        await openDesktopAuthCallback(target);
        return;
    }

    pendingDeepLinkUrl = target;
    if (!mainWindow) {
        await createWindow(target);
        return;
    }

    await loadDesktopTarget(target);
}
