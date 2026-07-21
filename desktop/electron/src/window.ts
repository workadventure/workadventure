import { BrowserWindow, app, net, shell, session } from "electron";
import ElectronLog from "electron-log";
import http from "http";
import crypto from "crypto";
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
    resolveInitialTarget,
    stripSensitiveQueryParams,
    type DesktopAuthCallback,
    type DesktopConfig,
} from "./desktop-url-policy";
import { shouldMaximizeBeforeLoad } from "./window-state-policy";
import { closePipWindow } from "./pip-window";
import { rememberWorldUrl } from "./world-history";
import { closeOverlayWindow } from "./overlay-window";
import { closeAllHudWindows } from "./hud-windows";

const DESKTOP_CALLBACK_FLOW_TTL_MS = 5 * 60 * 1000;
const DESKTOP_CALLBACK_SECRET_BYTES = 32;
const DESKTOP_CALLBACK_STATE_BYTES = 16;

type DesktopCallbackFlow = {
    state: string;
    secret: string;
    expiresAt: number;
    kind: "auth" | "logout";
};

let mainWindow: BrowserWindow | undefined;
let pendingDeepLinkUrl: string | undefined;
let desktopAuthCallbackServer: http.Server | undefined;
let desktopCallbackServerOrigin: string | undefined;
let desktopAuthWindow: BrowserWindow | undefined;
let landingRecoveryInProgress = false;
const desktopCallbackFlows = new Map<string, DesktopCallbackFlow>();

const LOAD_FAILURE_LANDING_MESSAGE =
    "This world could not be loaded. It may be offline, or the URL may be wrong.";

function randomToken(bytes: number) {
    return crypto.randomBytes(bytes).toString("hex");
}

function purgeExpiredDesktopCallbackFlows(now = Date.now()) {
    for (const [secret, flow] of desktopCallbackFlows) {
        if (flow.expiresAt <= now) {
            desktopCallbackFlows.delete(secret);
        }
    }
}

function consumeDesktopCallbackFlow(secret: string, state: string | null): DesktopCallbackFlow | undefined {
    purgeExpiredDesktopCallbackFlows();
    if (!secret || !state) {
        return undefined;
    }
    const flow = desktopCallbackFlows.get(secret);
    if (!flow) {
        return undefined;
    }
    desktopCallbackFlows.delete(secret);
    if (flow.expiresAt <= Date.now()) {
        return undefined;
    }
    try {
        const a = Buffer.from(flow.state, "utf8");
        const b = Buffer.from(state, "utf8");
        if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
            return undefined;
        }
    } catch {
        return undefined;
    }
    return flow;
}

function registerDesktopCallbackFlow(kind: "auth" | "logout"): DesktopCallbackFlow {
    purgeExpiredDesktopCallbackFlows();
    const flow: DesktopCallbackFlow = {
        state: randomToken(DESKTOP_CALLBACK_STATE_BYTES),
        secret: randomToken(DESKTOP_CALLBACK_SECRET_BYTES),
        expiresAt: Date.now() + DESKTOP_CALLBACK_FLOW_TTL_MS,
        kind,
    };
    desktopCallbackFlows.set(flow.secret, flow);
    return flow;
}

function buildLoopbackCallbackUrl(origin: string, flow: DesktopCallbackFlow): string {
    const path = flow.kind === "auth" ? "/auth/callback" : "/logout/callback";
    const url = new URL(`${path}/${flow.secret}`, origin);
    url.searchParams.set("state", flow.state);
    return url.toString();
}

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
    let protocol: string;
    try {
        protocol = new URL(url).protocol;
    } catch {
        return;
    }
    // Intentionally exclude "workadventure:" — only OS-level handlers (app.on('open-url') /
    // second-instance argv) should be able to drive the desktop auth callback. Allowing the
    // renderer to re-enter via shell.openExternal would let any in-app page (incl. XSS) trigger
    // openDesktopAuthCallback without an OS confirmation dialog.
    if (!["http:", "https:", "mailto:"].includes(protocol)) {
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
    const flow = registerDesktopCallbackFlow("auth");
    const desktopLoginUrl = createDesktopLoginUrl(url, buildLoopbackCallbackUrl(callbackOrigin, flow));
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
    const flow = registerDesktopCallbackFlow("logout");
    const desktopLogoutUrl = createDesktopLogoutUrl(url, buildLoopbackCallbackUrl(callbackOrigin, flow));
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

function isLoopbackHostHeader(host: string | undefined, port: number) {
    if (!host) {
        return false;
    }
    const expected = new Set([`127.0.0.1:${port}`, `localhost:${port}`, `[::1]:${port}`]);
    return expected.has(host.toLowerCase());
}

function maybeStopDesktopCallbackServer() {
    if (desktopCallbackFlows.size > 0) {
        return;
    }
    if (!desktopAuthCallbackServer) {
        return;
    }
    const server = desktopAuthCallbackServer;
    const previousOrigin = desktopCallbackServerOrigin;
    desktopAuthCallbackServer = undefined;
    desktopCallbackServerOrigin = undefined;
    server.close((err) => {
        if (err) {
            ElectronLog.debug(`Desktop callback server close error.`, err);
        } else if (previousOrigin) {
            ElectronLog.info(`Desktop callback server stopped (${previousOrigin}).`);
        }
    });
}

function ensureDesktopCallbackServer(): Promise<string> {
    if (desktopCallbackServerOrigin && desktopAuthCallbackServer) {
        return Promise.resolve(desktopCallbackServerOrigin);
    }

    const server = http.createServer((request, response) => {
        const address = server.address();
        const port = address && typeof address !== "string" ? address.port : 0;

        if (request.method !== "GET" && request.method !== "HEAD") {
            response.writeHead(405, { "Content-Type": "text/plain; charset=utf-8", Allow: "GET, HEAD" });
            response.end("Method Not Allowed");
            return;
        }

        if (!isLoopbackHostHeader(request.headers.host, port)) {
            ElectronLog.warn(
                `Rejected desktop callback request with unexpected Host header "${
                    request.headers.host ?? "<missing>"
                }".`
            );
            response.writeHead(421, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Misdirected Request");
            return;
        }

        const origin = request.headers.origin;
        if (origin && origin !== "null") {
            ElectronLog.warn(`Rejected desktop callback request with Origin "${origin}".`);
            response.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Forbidden");
            return;
        }

        const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
        const segments = requestUrl.pathname.split("/").filter(Boolean);
        if (
            segments.length !== 3 ||
            (segments[0] !== "auth" && segments[0] !== "logout") ||
            segments[1] !== "callback"
        ) {
            response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Not found");
            return;
        }

        const kind = segments[0] === "auth" ? "auth" : "logout";
        const secret = segments[2];
        const state = requestUrl.searchParams.get("state");
        const flow = consumeDesktopCallbackFlow(secret, state);
        if (!flow || flow.kind !== kind) {
            ElectronLog.warn(`Rejected desktop callback with invalid state for ${kind} flow.`);
            response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Invalid or expired callback state");
            return;
        }

        if (kind === "logout") {
            const targetUrl = requestUrl.searchParams.get("url");
            response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
            response.end(createDesktopCallbackPage("Déconnexion terminée. Vous pouvez revenir dans WorkAdventure."));

            closeDesktopAuthWindow();
            const config = getDesktopConfig();
            const safeTarget = targetUrl && isAllowedNavigationUrl(targetUrl, config) ? targetUrl : config.portalUrl;
            void loadDesktopTarget(safeTarget);
            maybeStopDesktopCallbackServer();
            return;
        }

        const callbackOrigin = requestUrl.searchParams.get("origin");
        const code = requestUrl.searchParams.get("code");
        if (!callbackOrigin || !code) {
            response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
            response.end("Missing desktop auth callback parameters");
            maybeStopDesktopCallbackServer();
            return;
        }

        response.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
        response.end(createDesktopCallbackPage("Connexion terminée. Vous pouvez revenir dans WorkAdventure."));

        closeDesktopAuthWindow();
        void openDesktopAuthCallback({ origin: callbackOrigin, code }).finally(maybeStopDesktopCallbackServer);
    });
    desktopAuthCallbackServer = server;

    return new Promise((resolve, reject) => {
        server.on("error", (err) => {
            ElectronLog.error("Desktop callback server error.", err);
            if (desktopAuthCallbackServer === server) {
                desktopAuthCallbackServer = undefined;
                desktopCallbackServerOrigin = undefined;
            }
            reject(err);
        });
        server.listen(0, "127.0.0.1", () => {
            const address = server.address();
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
        rememberWorldUrl(url);
    });

    // WorkAdventure is a SPA — travelling between rooms/worlds inside a session updates the URL
    // via history.pushState, which fires did-navigate-in-page (NOT did-navigate). Without this
    // handler, only the initial cold-launch URL ever lands in Recent worlds.
    window.webContents.on("did-navigate-in-page", (event, url, isMainFrame) => {
        if (!isMainFrame) {
            return;
        }
        rememberWorldUrl(url);
    });

    window.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL, isMainFrame) => {
        // -3 is ERR_ABORTED, fired when the user (or our own code) starts a new navigation before
        // the previous one settles. Ignoring it prevents recover loops when we're already reloading.
        if (!isMainFrame || errorCode === -3) {
            return;
        }
        const safeUrl = stripSensitiveQueryParams(validatedURL) || validatedURL || "";
        ElectronLog.warn(`did-fail-load (${errorCode}: ${errorDescription}) for "${safeUrl}".`);
        void recoverToLandingWithError(LOAD_FAILURE_LANDING_MESSAGE);
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
        closePipWindow();
        closeOverlayWindow();
        closeAllHudWindows();
    });

    mainWindow.on("resize", () => refreshRendererViewport("resize"));
    mainWindow.on("maximize", () => refreshRendererViewport("maximize"));
    mainWindow.on("unmaximize", () => refreshRendererViewport("unmaximize"));
    mainWindow.on("restore", () => refreshRendererViewport("restore"));
    mainWindow.on("enter-full-screen", () => refreshRendererViewport("enter-full-screen"));
    mainWindow.on("leave-full-screen", () => refreshRendererViewport("leave-full-screen"));
    // PiP lifecycle is owned by the renderer (shouldOpenNativePictureInPicture policy). Don't
    // close PiP defensively here: doing so would wipe manually-opened PiP whenever the user
    // clicks back onto the main app, AND the destroy-in-flight also races with the utility
    // window's loadFile, spraying ERR_FAILED logs and occasionally taking the whole app down.
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

/**
 * Load the native Landing HTML page (2 CTAs: Rejoindre / Créer). Called on first cold launch
 * when there's nothing to open yet, or from the native application/tray menu as an escape hatch
 * from a world whose web client does not expose desktop navigation. The Desktop navigation IPC
 * handlers then take over. When `errorMessage` is provided, it's rendered inline at the top of the
 * form via a `?error=` query param — used to surface load failures instead of silently reverting
 * to the portal.
 */
export async function loadLandingPage(errorMessage?: string): Promise<void> {
    if (!mainWindow) {
        throw new Error("Main window not found");
    }
    const landingPath = path.resolve(__dirname, "..", "assets", "landing", "index.html");
    const loadOptions = errorMessage ? { query: { error: errorMessage } } : undefined;
    try {
        await mainWindow.loadFile(landingPath, loadOptions);
    } catch (error) {
        ElectronLog.error(`Failed to load Landing page at ${landingPath}`, error);
        // Fall back to the portal URL — worst case the user still lands somewhere usable.
        await mainWindow.loadURL(getDesktopConfig().portalUrl);
    }
    showWindow();
}

/**
 * Bring the user back to the Landing with an inline error, instead of silently loading the portal
 * (which used to swallow bad URLs and disorient the user). The flag guards against `loadURL`
 * failures firing did-fail-load AND rejecting the `loadURL` promise in the same tick — without
 * the guard we'd load Landing twice back-to-back.
 */
async function recoverToLandingWithError(errorMessage: string): Promise<void> {
    if (landingRecoveryInProgress) {
        return;
    }
    landingRecoveryInProgress = true;
    try {
        await loadLandingPage(errorMessage);
    } finally {
        landingRecoveryInProgress = false;
    }
}

export async function loadDesktopTarget(requestedUrl?: string): Promise<boolean> {
    if (!mainWindow) {
        throw new Error("Main window not found");
    }

    const config = getDesktopConfig();
    const explicitTarget = requestedUrl || pendingDeepLinkUrl;
    const lastRoomUrl = settings.get("last_room_url");
    // First cold launch (nothing pending, no persisted room) → show the Landing instead of
    // silently loading the portal URL. Once the user picks a world (or a deep-link fires),
    // last_room_url is set and this branch never fires again.
    if (!explicitTarget && !lastRoomUrl) {
        pendingDeepLinkUrl = undefined;
        await loadLandingPage();
        return true;
    }
    const target = resolveInitialTarget(config, {
        pendingDeepLinkUrl: explicitTarget,
        lastRoomUrl,
    });
    pendingDeepLinkUrl = undefined;
    try {
        await mainWindow.loadURL(target);
        showWindow();
        return true;
    } catch (error) {
        ElectronLog.warn(`Failed to load desktop target "${target}".`, error);
        await recoverToLandingWithError(LOAD_FAILURE_LANDING_MESSAGE);
        return false;
    }
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
