#!/usr/bin/env node
/**
 * WorkAdventure gateway — replacement for the Traefik reverse proxy used in docker-compose.
 * Pure Node.js (no dependencies). Routes, like Traefik, by:
 *
 *  1) Host header (docker-compatible multi-host mode):
 *       front.workadventure.localhost        -> play Vite dev server
 *       map-storage.workadventure.localhost  -> map-storage (/ui/ -> its UI)
 *       uploader.workadventure.localhost     -> uploader
 *       maps.workadventure.localhost         -> static maps server
 *       api.workadventure.localhost          -> back
 *       *.workadventure.localhost (catch-all)-> play pusher (/ws/ -> pusher WebSocket)
 *
 *  2) Path prefix (single-domain mode, works on ANY host — including tunnels/previews):
 *       /ws/            -> play pusher WebSocket
 *       /api            -> back              (prefix stripped)
 *       /uploader       -> uploader          (prefix stripped)
 *       /map-storage/ui -> map-storage UI    (prefix "/map-storage" stripped)
 *       /map-storage    -> map-storage       (prefix stripped)
 *       /maps           -> static maps server(prefix stripped)
 *       /icon           -> 204 stub
 *       /src /node_modules /@fs /@vite /@id … -> play Vite dev server (same-origin module graph)
 *       anything else   -> play pusher
 *
 * Environment (all optional, normally provided by start.mjs):
 *   GATEWAY_HOST (default 127.0.0.1), GATEWAY_PORT (default 8080)
 *   PUSHER_HTTP_PORT 3000, PUSHER_WS_PORT 3001, FRONT_VITE_PORT 8080, HTTP_PORT 8080 (back),
 *   MAP_STORAGE_HTTP_PORT 3000, MAP_STORAGE_UI_PORT 8080, UPLOADER_PORT 8080
 *   WA_GATEWAY_X_FORWARDED_PROTO — force this value in X-Forwarded-Proto (e.g. "https"
 *   behind a TLS tunnel). When unset, an incoming X-Forwarded-Proto is trusted, else "http".
 */

import http from "node:http";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const GATEWAY_HOST = process.env.GATEWAY_HOST || "127.0.0.1";
const GATEWAY_PORT = Number(process.env.GATEWAY_PORT) || 8080;

const T = {
    pusherHttp: Number(process.env.PUSHER_HTTP_PORT) || 3000,
    pusherWs: Number(process.env.PUSHER_WS_PORT) || 3001,
    viteFront: Number(process.env.FRONT_VITE_PORT) || 8080,
    back: Number(process.env.HTTP_PORT) || 8080,
    mapStorage: Number(process.env.MAP_STORAGE_HTTP_PORT) || 3000,
    mapStorageUi: Number(process.env.MAP_STORAGE_UI_PORT) || 8080,
    uploader: Number(process.env.UPLOADER_PORT) || 8080,
};

const FORCED_XFP = process.env.WA_GATEWAY_X_FORWARDED_PROTO; // e.g. "https"
const MAPS_ROOT = path.join(ROOT, "maps");

const VITE_PREFIXES = [
    "/src/",
    "/node_modules/",
    "/@fs/",
    "/@vite/",
    "/@id/",
    "/@svelte",
    "/@tailwindcss/",
    "/@esbuild/",
    "/~icons/",
    "/__vite",
    "/.svelte-kit/",
];

const MIME = {
    ".json": "application/json; charset=utf-8",
    ".tmj": "application/json; charset=utf-8",
    ".wam": "application/json; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".html": "text/html; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".gif": "image/gif",
    ".webp": "image/webp",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon",
    ".woff": "font/woff",
    ".woff2": "font/woff2",
    ".mp3": "audio/mpeg",
    ".ogg": "audio/ogg",
    ".wav": "audio/wav",
    ".zip": "application/zip",
};

function log(...args) {
    console.log("[gateway]", ...args);
}

/** Split "host:port" / "[::1]:port" into a bare hostname. */
function hostnameOf(hostHeader) {
    if (!hostHeader) return "";
    let h = hostHeader.trim().toLowerCase();
    if (h.startsWith("[")) {
        const end = h.indexOf("]");
        return h.slice(0, end + 1);
    }
    const colon = h.indexOf(":");
    return colon === -1 ? h : h.slice(0, colon);
}

function matchesHost(host, name) {
    return host === name || host.endsWith("." + name);
}

/**
 * Decide where to send a request.
 * Returns { target: "pusher"|"pusherWs"|"vite"|"viteMapStorage"|"back"|"mapStorage"|"mapStorageUi"|"uploader"|"maps"|"icon",
 *          strip?: string }
 */
function route(req) {
    const host = hostnameOf(req.headers.host);
    const url = req.url || "/";
    const pathname = url.split("?")[0];

    // --- multi-host (docker-style) routing ---
    if (matchesHost(host, "front.workadventure.localhost")) return { target: "vite" };
    if (matchesHost(host, "map-storage.workadventure.localhost")) {
        return pathname.startsWith("/ui/") || pathname === "/ui"
            ? { target: "mapStorageUi" }
            : { target: "mapStorage" };
    }
    if (matchesHost(host, "uploader.workadventure.localhost")) return { target: "uploader" };
    if (matchesHost(host, "maps.workadventure.localhost")) return { target: "maps", strip: "" };
    if (matchesHost(host, "api.workadventure.localhost")) return { target: "back" };
    if (matchesHost(host, "icon.workadventure.localhost")) return { target: "icon" };
    if (matchesHost(host, "room-api.workadventure.localhost")) return { target: "roomApiNotice" };

    // --- single-domain (path-based) routing — works on any host ---
    if (pathname === "/ws" || pathname.startsWith("/ws/")) return { target: "pusherWs" };
    if (pathname === "/api" || pathname.startsWith("/api/")) return { target: "back", strip: "/api" };
    if (pathname === "/uploader" || pathname.startsWith("/uploader/")) {
        return { target: "uploader", strip: "/uploader" };
    }
    if (pathname === "/map-storage/ui" || pathname.startsWith("/map-storage/ui/")) {
        return { target: "mapStorageUi", strip: "/map-storage" };
    }
    if (pathname === "/map-storage" || pathname.startsWith("/map-storage/")) {
        return { target: "mapStorage", strip: "/map-storage" };
    }
    if (pathname === "/maps" || pathname.startsWith("/maps/")) {
        return { target: "maps", strip: "/maps" };
    }
    if (pathname === "/icon" || pathname.startsWith("/icon/")) return { target: "icon" };

    for (const prefix of VITE_PREFIXES) {
        if (pathname === prefix || pathname.startsWith(prefix)) return { target: "vite" };
    }

    return { target: "pusher" };
}

function routeWs(req) {
    const host = hostnameOf(req.headers.host);
    const url = req.url || "/";
    const pathname = url.split("?")[0];

    if (matchesHost(host, "front.workadventure.localhost")) return { target: "vite" };
    if (matchesHost(host, "map-storage.workadventure.localhost")) {
        return pathname.startsWith("/ui/") ? { target: "mapStorageUi" } : { target: "mapStorage" };
    }
    if (pathname === "/ws" || pathname.startsWith("/ws/")) return { target: "pusherWs" };
    for (const prefix of VITE_PREFIXES) {
        if (pathname === prefix || pathname.startsWith(prefix)) return { target: "vite" };
    }
    if (pathname.startsWith("/@")) return { target: "vite" };
    return { target: "pusherWs" };
}

function portOf(target) {
    switch (target) {
        case "pusher":
            return T.pusherHttp;
        case "pusherWs":
            return T.pusherWs;
        case "vite":
            return T.viteFront;
        case "viteMapStorage":
        case "mapStorageUi":
            return T.mapStorageUi;
        case "back":
            return T.back;
        case "mapStorage":
            return T.mapStorage;
        case "uploader":
            return T.uploader;
        default:
            return null;
    }
}

function strippedPath(url, strip) {
    if (!strip) return url;
    let p = url.slice(strip.length);
    if (p === "") p = "/";
    if (!p.startsWith("/")) p = "/" + p;
    return p;
}

function serveStatic(req, res, rootDir, urlPath) {
    const decoded = decodeURIComponent(urlPath.split("?")[0]);
    const safe = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
    const filePath = path.join(rootDir, safe);
    if (!filePath.startsWith(rootDir)) {
        res.writeHead(403).end("Forbidden");
        return;
    }
    fs.stat(filePath, (err, stat) => {
        if (err || !stat.isFile()) {
            res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" });
            res.end("404 Not Found (maps static server): " + decoded);
            return;
        }
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, {
            "Content-Type": MIME[ext] || "application/octet-stream",
            "Content-Length": stat.size,
            "Cache-Control": "no-cache",
            "Access-Control-Allow-Origin": "*",
        });
        fs.createReadStream(filePath).pipe(res);
    });
}

function proxyHttp(req, res, routeInfo) {
    const port = portOf(routeInfo.target);
    const targetPath = strippedPath(req.url, routeInfo.strip);
    const headers = { ...req.headers };
    const xfp = req.headers["x-forwarded-proto"] || FORCED_XFP || "http";
    headers["x-forwarded-proto"] = xfp;
    headers["x-forwarded-host"] = req.headers.host;
    headers["x-forwarded-for"] = req.socket.remoteAddress;
    delete headers["accept-encoding"]; // keep the proxy simple (no re-encoding)

    const upstream = http.request(
        { host: "127.0.0.1", port, path: targetPath, method: req.method, headers },
        (upRes) => {
            res.writeHead(upRes.statusCode || 502, upRes.headers);
            upRes.pipe(res);
        },
    );
    upstream.on("error", (err) => {
        log(`proxy error -> ${routeInfo.target}:${port} ${targetPath}: ${err.message}`);
        if (!res.headersSent) {
            res.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" });
        }
        res.end(
            `502 Bad Gateway\n\nService "${routeInfo.target}" (port ${port}) is not reachable.\n` +
                `Start the WorkAdventure services with: node no-docker/start.mjs\n`,
        );
    });
    req.pipe(upstream);
}

function proxyWs(req, socket, head, routeInfo) {
    const port = portOf(routeInfo.target);
    const targetPath = strippedPath(req.url, routeInfo.strip);
    const headers = { ...req.headers };
    headers["x-forwarded-proto"] = req.headers["x-forwarded-proto"] || FORCED_XFP || "http";
    headers["x-forwarded-host"] = req.headers.host;

    const upstream = http.request({
        host: "127.0.0.1",
        port,
        path: targetPath,
        method: req.method,
        headers,
    });
    upstream.on("upgrade", (upRes, upSocket, upHead) => {
        const lines = [`HTTP/1.1 ${upRes.statusCode} ${upRes.statusMessage || "Switching Protocols"}`];
        for (let i = 0; i < upRes.rawHeaders.length; i += 2) {
            lines.push(`${upRes.rawHeaders[i]}: ${upRes.rawHeaders[i + 1]}`);
        }
        socket.write(lines.join("\r\n") + "\r\n\r\n");
        if (upHead && upHead.length) socket.write(upHead);
        if (head && head.length) upSocket.write(head);
        upSocket.pipe(socket);
        socket.pipe(upSocket);
    });
    upstream.on("response", (upRes) => {
        // Non-101 answer (e.g. 404): relay it and close.
        const lines = [`HTTP/1.1 ${upRes.statusCode} ${upRes.statusMessage || ""}`];
        for (let i = 0; i < upRes.rawHeaders.length; i += 2) {
            lines.push(`${upRes.rawHeaders[i]}: ${upRes.rawHeaders[i + 1]}`);
        }
        socket.end(lines.join("\r\n") + "\r\n\r\n");
    });
    upstream.on("error", (err) => {
        log(`ws proxy error -> ${routeInfo.target}:${port} ${targetPath}: ${err.message}`);
        socket.destroy();
    });
    if (head && head.length) upstream.write(head);
    upstream.end();
}

const server = http.createServer((req, res) => {
    const routeInfo = route(req);
    const pathname = (req.url || "/").split("?")[0];

    if (pathname === "/gateway-health") {
        res.writeHead(200, { "Content-Type": "text/plain" }).end("ok");
        return;
    }

    switch (routeInfo.target) {
        case "maps":
            serveStatic(req, res, MAPS_ROOT, strippedPath(req.url, routeInfo.strip));
            return;
        case "icon":
            // Minimal icon-service stub (the real icon server is an optional Docker image).
            res.writeHead(204, { "Access-Control-Allow-Origin": "*" }).end();
            return;
        case "roomApiNotice":
            res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" }).end(
                "The Room API is a gRPC service and is not routed by the no-docker gateway.\n" +
                    "Connect directly to the gRPC endpoint (default: localhost:50052).\n",
            );
            return;
        default:
            proxyHttp(req, res, routeInfo);
    }
});

server.on("upgrade", (req, socket, head) => {
    proxyWs(req, socket, head, routeWs(req));
});

server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
        console.error(
            `[gateway] Port ${GATEWAY_PORT} is already in use. ` +
                `Stop the other process or set GATEWAY_PORT to a free port.`,
        );
        process.exit(1);
    }
    console.error("[gateway] server error:", err);
    process.exit(1);
});

server.listen(GATEWAY_PORT, GATEWAY_HOST, () => {
    log(`listening on http://${GATEWAY_HOST}:${GATEWAY_PORT} (routes: host + path, like Traefik)`);
    log(`maps static root: ${MAPS_ROOT}`);
});
