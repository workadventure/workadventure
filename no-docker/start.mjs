#!/usr/bin/env node
/**
 * WorkAdventure — local development WITHOUT Docker.
 *
 * Bootstraps the monorepo (npm install, protobuf + i18n code generation), then starts all
 * services directly with Node and puts the gateway (no-docker/gateway.mjs) in front of them,
 * so you can browse http://play.workadventure.localhost:PORT exactly like the Docker setup.
 *
 * Usage:
 *   node no-docker/start.mjs [options]
 *
 * Options:
 *   --dev                 Also start the code watchers (typesafe-i18n, svelte-check, iframe-api, proto)
 *   --no-map-storage      Do not start the map-storage service
 *   --no-uploader         Do not start the uploader service
 *   --with-map-storage-ui Start the map-storage web UI (http://…/map-storage/ui/)
 *   --tunnel              For public tunnels/previews: bind 0.0.0.0, disable Vite HMR,
 *                         force X-Forwarded-Proto=https
 *   --port=N              Gateway port (default: 80, falling back to 8080 then 8000)
 *   --host=HOST           Gateway bind address (default 127.0.0.1)
 *   --reinstall           Force "npm install" again
 *   --help                Show this help
 *
 * Everything can also be controlled with environment variables (CLI wins):
 *   GATEWAY_PORT, GATEWAY_HOST, START_ROOM_URL, SECRET_KEY, ...
 */

import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import readline from "node:readline";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

// ---------------------------------------------------------------- CLI args
const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith("--") && !a.includes("=")));
// Value-flags: --map=school (folder under ./maps) or --world=<full START_ROOM_URL path>
const valueArgs = new Map(
    args.filter((a) => a.startsWith("--") && a.includes("=")).map((a) => {
        const i = a.indexOf("=");
        return [a.slice(2, i), a.slice(i + 1)];
    }),
);
const opts = Object.fromEntries(
    args.filter((a) => a.startsWith("--") && a.includes("=")).map((a) => {
        const i = a.indexOf("=");
        return [a.slice(0, i), a.slice(i + 1)];
    }),
);

if (flags.has("--help")) {
    console.log(fs.readFileSync(fileURLToPath(import.meta.url), "utf8").split("*/")[0].replace(/^\/\*\*?/, ""));
    process.exit(0);
}

// ---------------------------------------------------------------- helpers
const C = {
    reset: "\x1b[0m",
    dim: "\x1b[2m",
    bold: "\x1b[1m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    red: "\x1b[31m",
    cyan: "\x1b[36m",
    magenta: "\x1b[35m",
    blue: "\x1b[34m",
};

function parseDotenv(text) {
    const out = {};
    for (const rawLine of text.split(/\r?\n/)) {
        const line = rawLine.trim();
        if (!line || line.startsWith("#")) continue;
        const eq = line.indexOf("=");
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let value = line.slice(eq + 1).trim();
        if (
            (value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
            (value.startsWith("'") && value.endsWith("'") && value.length >= 2)
        ) {
            value = value.slice(1, -1);
        }
        out[key] = value;
    }
    return out;
}

function canBind(port, host) {
    return new Promise((resolve) => {
        const srv = net.createServer();
        srv.once("error", () => resolve(false));
        srv.once("listening", () => srv.close(() => resolve(true)));
        srv.listen(port, host);
    });
}

function waitForPort(port, timeoutMs = 120000) {
    const started = Date.now();
    return new Promise((resolve, reject) => {
        const tryOnce = () => {
            const socket = net.connect({ host: "127.0.0.1", port }, () => {
                socket.destroy();
                resolve(true);
            });
            socket.on("error", () => {
                socket.destroy();
                if (Date.now() - started > timeoutMs) reject(new Error(`timeout waiting for port ${port}`));
                else setTimeout(tryOnce, 500);
            });
        };
        tryOnce();
    });
}

function run(cmd, cmdArgs, cwd, env, label) {
    const display = `${cmd} ${cmdArgs.join(" ")}`;
    console.log(`${C.dim}[${label}] $ ${display}${C.reset}`);
    const r = spawnSync(isWin ? `${cmd}.cmd` : cmd, cmdArgs, {
        cwd,
        env,
        stdio: "inherit",
        shell: isWin,
    });
    if (r.status !== 0) {
        console.error(`${C.red}[${label}] command failed (exit ${r.status}): ${display}${C.reset}`);
        process.exit(r.status ?? 1);
    }
}

const children = [];
const childColors = [C.green, C.cyan, C.magenta, C.yellow, C.blue, C.red, C.dim];
let colorIdx = 0;

function spawnService(label, cmd, cmdArgs, cwd, env) {
    const color = childColors[colorIdx++ % childColors.length];
    const isAbsolute = cmd.includes("/") || cmd.includes("\\");
    const child = spawn(!isAbsolute && isWin ? `${cmd}.cmd` : cmd, cmdArgs, {
        cwd,
        env,
        stdio: ["ignore", "pipe", "pipe"],
        shell: isWin && !isAbsolute,
    });
    const prefix = `${color}[${label}]${C.reset} `;
    const pipe = (stream) => {
        readline.createInterface({ input: stream }).on("line", (line) => {
            if (line.trim() !== "") console.log(prefix + line);
        });
    };
    pipe(child.stdout);
    pipe(child.stderr);
    child.on("exit", (code, signal) => {
        if (!shuttingDown) {
            console.log(`${prefix}${C.red}process exited (code=${code} signal=${signal}) — stopping everything${C.reset}`);
            shutdown(1);
        }
    });
    children.push({ label, child });
    return child;
}

let shuttingDown = false;
function shutdown(code = 0) {
    if (shuttingDown) return;
    shuttingDown = true;
    for (const { child } of children) {
        try {
            child.kill("SIGTERM");
        } catch {
            /* ignore */
        }
    }
    setTimeout(() => process.exit(code), 500);
}
process.on("SIGINT", () => {
    console.log(`\n${C.yellow}Stopping all services...${C.reset}`);
    shutdown(0);
});
process.on("SIGTERM", () => shutdown(0));

// ---------------------------------------------------------------- checks
const nodeMajor = Number(process.versions.node.split(".")[0]);
if (nodeMajor < 20) {
    console.error(`${C.red}Node.js >= 20 is required (found ${process.versions.node}).${C.reset}`);
    process.exit(1);
}

/**
 * uWebSockets.js ships prebuilt native binaries. Recent tags (>= v20.55) are built against
 * glibc 2.38+, which fails on older distros (Debian 12, Ubuntu 22.04, ...). Detect that at
 * startup and offer a drop-in older build (same v20 API) instead of a cryptic crash later.
 */
function probeUWebSockets() {
    const probe = spawnSync(
        process.execPath,
        ["-e", "require('uWebSockets.js'); console.log('uws-ok')"],
        { cwd: ROOT, encoding: "utf8", timeout: 20000 },
    );
    return { ok: probe.status === 0 && probe.stdout.includes("uws-ok"), output: `${probe.stdout}${probe.stderr}` };
}

function fixUWebSockets() {
    console.log(
        `\n${C.yellow}The prebuilt uWebSockets.js binary is incompatible with your system libc ` +
            `(it needs glibc >= 2.38). Trying the last build compatible with older glibc (v20.52.0)…${C.reset}\n` +
            `${C.dim}You can also run this manually: npm install --no-save github:uNetworking/uWebSockets.js#v20.52.0${C.reset}`,
    );
    run(
        "npm",
        ["install", "--no-save", "github:uNetworking/uWebSockets.js#v20.52.0"],
        ROOT,
        { ...installEnv, ...dotenvEnv, ...process.env },
        "uws-fix",
    );
    return probeUWebSockets();
}

console.log(`${C.bold}WorkAdventure - starting WITHOUT Docker${C.reset}`);
console.log(`${C.dim}Repository: ${ROOT}${C.reset}`);
console.log(`${C.dim}Node: ${process.versions.node} (${process.platform})${C.reset}\n`);

// ---------------------------------------------------------------- .env
const envFile = path.join(ROOT, ".env");
if (!fs.existsSync(envFile)) {
    fs.copyFileSync(path.join(ROOT, ".env.template"), envFile);
    console.log(`${C.green}+ Created .env from .env.template${C.reset}`);
}
const dotenvEnv = parseDotenv(fs.readFileSync(envFile, "utf8"));

// Precedence: defaults < .env < real process environment < managed keys (below).
const baseEnv = { ...process.env };
const childEnv = { ...dotenvEnv, ...process.env };

// ---------------------------------------------------------------- ports / URLs
const bindHost = opts["--host"] || process.env.GATEWAY_HOST || (flags.has("--tunnel") ? "0.0.0.0" : "127.0.0.1");

async function pickGatewayPort() {
    if (opts["--port"] || process.env.GATEWAY_PORT) {
        return Number(opts["--port"] || process.env.GATEWAY_PORT);
    }
    for (const candidate of [80, 8080, 8000]) {
        // eslint-disable-next-line no-await-in-loop
        if (await canBind(candidate, bindHost)) return candidate;
    }
    return 8888;
}

const GATEWAY_PORT = await pickGatewayPort();

const P = {
    pusherHttp: 3000,
    pusherWs: 3001,
    roomApi: 50052, // docker default 50051 clashes with the back gRPC port on a single host
    viteFront: 3010,
    backHttp: 3020,
    backGrpc: 50051,
    mapStorageHttp: 3030,
    mapStorageGrpc: 50053,
    mapStorageUi: 3031,
    uploader: 3040,
};

const PUBLIC_HOST = "play.workadventure.localhost";
const PUBLIC_URL = `http://${PUBLIC_HOST}${GATEWAY_PORT === 80 ? "" : `:${GATEWAY_PORT}`}`;

// ---------------------------------------------------------------- bootstrap
const installEnv = {
    ...baseEnv,
    PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: "1",
    PUPPETEER_SKIP_DOWNLOAD: "1",
    ADBLOCK: "1",
    DISABLE_OPENCOLLECTIVE: "1",
};

if (flags.has("--reinstall") || !fs.existsSync(path.join(ROOT, "node_modules"))) {
    console.log(`\n${C.bold}--> npm install (root workspaces)...${C.reset}`);
    run("npm", ["install", "--ignore-scripts"], ROOT, installEnv, "install");
}

const protoGenerated = path.join(ROOT, "libs", "messages", "src", "ts-proto-generated", "messages.ts");
const messagesDir = path.join(ROOT, "messages");
if (flags.has("--reinstall") || !fs.existsSync(path.join(messagesDir, "node_modules"))) {
    console.log(`\n${C.bold}→ npm install (messages / protobuf toolchain)…${C.reset}`);
    run("npm", ["install", "--ignore-scripts"], messagesDir, installEnv, "install:messages");
}
// gen-proto needs a protobuf compiler; grpc-tools' binary host is unreachable here, so
// guarantee the pure-Go `buf` compiler is present (prebuilt platform package).
if (!fs.existsSync(path.join(messagesDir, "node_modules", "@bufbuild", "buf"))) {
    run("npm", ["install", "--no-save", "--ignore-scripts", "@bufbuild/buf"], messagesDir, installEnv, "install:buf");
}
if (flags.has("--reinstall") || !fs.existsSync(protoGenerated) || fs.statSync(protoGenerated).size === 0) {
    console.log(`\n${C.bold}→ Generating protobuf code (messages → libs/messages)…${C.reset}`);
    run("npm", ["run", "ts-proto"], messagesDir, childEnv, "proto");
}

const i18nGenerated = path.join(ROOT, "play", "src", "i18n", "i18n-types.ts");
if (flags.has("--reinstall") || !fs.existsSync(i18nGenerated)) {
    console.log(`\n${C.bold}→ Generating typesafe-i18n translations…${C.reset}`);
    run("npm", ["run", "typesafe-i18n"], path.join(ROOT, "play"), childEnv, "i18n");
}

const iframeApi = path.join(ROOT, "play", "public", "iframe_api.js");
if (flags.has("--reinstall") || !fs.existsSync(iframeApi)) {
    console.log(`\n${C.bold}→ Building the IFrame API…${C.reset}`);
    run("npm", ["run", "build-iframe-api"], path.join(ROOT, "play"), childEnv, "iframe-api");
}

// --- uWebSockets.js native binary compatibility (glibc) ---
if (fs.existsSync(path.join(ROOT, "node_modules", "uWebSockets.js"))) {
    let probe = probeUWebSockets();
    if (!probe.ok) {
        if (/GLIBC/i.test(probe.output)) {
            probe = fixUWebSockets();
        }
        if (!probe.ok) {
            console.error(
                `${C.red}uWebSockets.js cannot be loaded on this system:${C.reset}\n${probe.output}\n` +
                    `See no-docker/README.md (Troubleshooting / استكشاف الأخطاء).`,
            );
            process.exit(1);
        }
    }
    console.log(`${C.green}+ uWebSockets.js native binary OK${C.reset}`);
}

// ---------------------------------------------------------------- managed environment
// These keys are computed for a single-host, Docker-free setup and always win.
const managed = {
    NODE_ENV: "development",

    // --- gateway / public URLs (single-domain mode) ---
    // Browser-facing URLs are RELATIVE so the app works from any host the user browses:
    // http://play.workadventure.localhost:PORT, http://127.0.0.1:PORT, a LAN IP, or a tunnel URL.
    GATEWAY_HOST: bindHost,
    GATEWAY_PORT: String(GATEWAY_PORT),
    PUSHER_URL: "/",
    FRONT_URL: "/",
    UPLOADER_URL: "/uploader",
    ICON_URL: "/icon",
    // PLAY_URL / PUBLIC_MAP_STORAGE_URL must be absolute URLs (server-side + validators).
    PLAY_URL: PUBLIC_URL,
    PUBLIC_MAP_STORAGE_URL: `${PUBLIC_URL}/map-storage`,
    INTERNAL_MAP_STORAGE_URL: `http://127.0.0.1:${P.mapStorageHttp}`,
    ALLOWED_CORS_ORIGIN: "*",

    // --- internal ports ---
    PUSHER_HTTP_PORT: String(P.pusherHttp),
    PUSHER_WS_PORT: String(P.pusherWs),
    ROOM_API_PORT: String(P.roomApi),
    FRONT_VITE_PORT: String(P.viteFront),
    HTTP_PORT: String(P.backHttp),
    GRPC_PORT: String(P.backGrpc),
    MAP_STORAGE_HTTP_PORT: String(P.mapStorageHttp),
    MAP_STORAGE_GRPC_PORT: String(P.mapStorageGrpc),
    MAP_STORAGE_UI_PORT: String(P.mapStorageUi),
    UPLOADER_PORT: String(P.uploader),

    // --- service wiring (loopback instead of Docker DNS names) ---
    API_URL: `127.0.0.1:${P.backGrpc}`,
    MAP_STORAGE_URL: `127.0.0.1:${P.mapStorageGrpc}`,
    MAP_STORAGE_API_TOKEN: "FFVSGBSGBSGFB23SFGBSFG4BS",

    // --- map-storage auth (same defaults as docker-compose.yaml) ---
    ENABLE_BASIC_AUTHENTICATION: "true",
    AUTHENTICATION_USER: "john.doe",
    AUTHENTICATION_PASSWORD: "password",
    ENABLE_BEARER_AUTHENTICATION: "true",
    AUTHENTICATION_TOKEN: "123",
    PATH_PREFIX: "",
    WHITELISTED_RESOURCE_URLS: "",

    // --- anonymous mode: no OIDC mock server, no Redis, no Matrix ---
    OPENID_CLIENT_ID: "",
    OPENID_CLIENT_SECRET: "",
    OPENID_CLIENT_ISSUER: "",
    ADMIN_API_URL: "",
    DISABLE_ANONYMOUS: "false",
    MAP_EDITOR_ALLOW_ALL_USERS: "true",
    ENABLE_MAP_EDITOR: "true",
    ENABLE_OPENAPI_ENDPOINT: "true",
    ENABLE_CHAT_UPLOAD: "false",
    STORE_VARIABLES_FOR_LOCAL_MAPS: "true",
    ALLOW_ARTILLERY: "true",
    // Leave REDIS_HOST and MATRIX_* unset: services fall back to in-memory / proximity chat.

    // "{host}" is replaced at request time with the host the user is browsing
    // (see play/src/pusher/services/LocalAdmin.ts). This makes the same setting work
    // on http://play.workadventure.localhost:PORT AND behind any tunnel/preview URL.
    // --map=<folder under ./maps> selects the landing map (default: starter).
    START_ROOM_URL:
        valueArgs.get("world")
        ?? process.env.START_ROOM_URL
        ?? `/_/global/{host}/maps/${valueArgs.get("map") ?? "starter"}/map.json`,

    // --- Vite dev servers ---
    WA_DEV_ALLOWED_HOSTS: "true",
    WA_DEV_HMR_HOST: "front.workadventure.localhost",
    WA_DEV_HMR_CLIENT_PORT: String(GATEWAY_PORT),
};
if (flags.has("--tunnel")) {
    // Behind a TLS-terminating tunnel/preview: no Vite HMR websocket, and the gateway must
    // advertise https in X-Forwarded-Proto so the app builds https URLs.
    managed.WA_DEV_HMR = "false";
    managed.WA_GATEWAY_X_FORWARDED_PROTO = "https";
}

const env = { ...childEnv, ...managed };
// Force-drop the deprecated OPID_* variables (they trigger deprecation warnings and are
// unused in the Docker-free anonymous mode).
for (const key of ["OPID_CLIENT_ID", "OPID_CLIENT_SECRET", "OPID_CLIENT_ISSUER", "OPID_SCOPE", "OPID_PROMPT"]) {
    delete env[key];
}
if (!env.SECRET_KEY) {
    env.SECRET_KEY = "yourSecretKey2020";
    console.log(`${C.yellow}⚠ SECRET_KEY not set — using the .env.template default.${C.reset}`);
}

console.log(`\n${C.bold}Configuration:${C.reset}`);
console.log(`  Public URL        : ${C.cyan}${PUBLIC_URL}${C.reset}`);
console.log(`  Start room        : ${managed.START_ROOM_URL}`);
console.log(`  Gateway bind      : ${bindHost}:${GATEWAY_PORT}`);
console.log(
    `  Services          : pusher:${P.pusherHttp}/${P.pusherWs} room-api:${P.roomApi} vite:${P.viteFront} ` +
        `back:${P.backHttp}+gRPC:${P.backGrpc} map-storage:${P.mapStorageHttp}+gRPC:${P.mapStorageGrpc} uploader:${P.uploader}`,
);
console.log(`  Mode              : anonymous (no OIDC / no Redis / no Matrix)${C.reset}\n`);

// ---------------------------------------------------------------- start services
console.log(`${C.bold}→ Starting services…${C.reset}`);

const npmExec = (label, npmArgs, cwd) => spawnService(label, "npm", npmArgs, cwd, env);
const tsx = (label, tsxArgs, cwd, extraEnv = {}) =>
    spawnService(label, "npx", ["tsx", ...tsxArgs], cwd, { ...env, ...extraEnv });

// back (gRPC + HTTP API)
tsx("back", ["watch", "--clear-screen=false", `--inspect=127.0.0.1:9232`, "src/server.ts"], path.join(ROOT, "back"));

// play pusher (+ Room API) — TSX_TSCONFIG_PATH selects the server tsconfig like in package.json
tsx(
    "pusher",
    ["watch", "--clear-screen=false", `--inspect=127.0.0.1:9231`, "./src/server.ts"],
    path.join(ROOT, "play"),
    { TSX_TSCONFIG_PATH: "tsconfig-pusher.json" },
);

// play front (Vite)
spawnService("front", "npx", ["vite"], path.join(ROOT, "play"), env);

// map-storage
if (!flags.has("--no-map-storage")) {
    tsx(
        "map-storage",
        ["watch", "--clear-screen=false", `--inspect=127.0.0.1:9233`, "./src/index.ts"],
        path.join(ROOT, "map-storage"),
        { ESBK_TSCONFIG_PATH: "tsconfig-node.json" },
    );
    if (flags.has("--with-map-storage-ui")) {
        spawnService("map-ui", "npx", ["vite", "dev"], path.join(ROOT, "map-storage"), env);
    }
}

// uploader
if (!flags.has("--no-uploader")) {
    tsx("uploader", ["watch", "--clear-screen=false", `--inspect=127.0.0.1:9234`, "./server.ts"], path.join(ROOT, "uploader"));
}

// dev watchers (optional)
if (flags.has("--dev")) {
    npmExec("i18n-watch", ["run", "typesafe-i18n-watch"], path.join(ROOT, "play"));
    npmExec("svelte-check", ["run", "svelte-check-watch"], path.join(ROOT, "play"));
    npmExec("iframe-api", ["run", "watch-iframe-api"], path.join(ROOT, "play"));
    npmExec("proto-watch", ["run", "proto:watch"], path.join(ROOT, "messages"));
}

// gateway (Traefik replacement) — always last
spawnService("gateway", process.execPath, [path.join(ROOT, "no-docker", "gateway.mjs")], ROOT, env);

// ---------------------------------------------------------------- readiness + banner
const checks = [
    ["front (Vite)", P.viteFront],
    ["pusher", P.pusherHttp],
    ["back", P.backHttp],
];
if (!flags.has("--no-map-storage")) checks.push(["map-storage", P.mapStorageHttp]);
if (!flags.has("--no-uploader")) checks.push(["uploader", P.uploader]);
checks.push(["gateway", GATEWAY_PORT]);

try {
    await Promise.all(checks.map(([label, port]) => waitForPort(port).then(() => console.log(`  ${C.green}✔${C.reset} ${label} (port ${port})`))));
} catch (e) {
    console.error(`${C.red}⚠ Startup problem: ${e.message}${C.reset}`);
}

console.log(`
${C.green}${C.bold}=====================================================
   WorkAdventure is running WITHOUT Docker!
   ورك أدفنتشر يعمل الآن بدون دوكر!
=====================================================${C.reset}

  ${C.bold}Open in your browser / افتح في المتصفح:${C.reset}
      ${C.cyan}${C.bold}${PUBLIC_URL}${C.reset}

  Tips / نصائح:
   - Open the URL in TWO windows to see multiplayer working.
     (افتح الرابط في نافذتين لتجربة وضع اللعب الجماعي)
   - Login is anonymous: just pick a name and a Woka.
     (الدخول بدون تسجيل: اختر اسماً وشخصية فقط)
   - The starter map is served from ./maps by the gateway.
   - Map editor & uploads: ${PUBLIC_URL}/map-storage (works best on your own machine).
   - Press Ctrl+C to stop everything. (إيقاف كل شيء: Ctrl+C)
`);

if (!flags.has("--tunnel")) {
    // Non-blocking liveness probe of the room redirect (best effort).
    fetch(`${PUBLIC_URL}/gateway-health`)
        .then((r) => r.text())
        .then((t) => console.log(`  ${C.dim}gateway health: ${t}${C.reset}`))
        .catch(() => {
            console.log(
                `  ${C.yellow}⚠ Could not resolve ${PUBLIC_HOST}. If the URL does not open, add this line to your hosts file:\n` +
                    `    127.0.0.1 ${PUBLIC_HOST} front.${PUBLIC_HOST}\n` +
                    `    (On most systems *.localhost already points to 127.0.0.1 — see no-docker/README.md)${C.reset}`,
            );
        });
}
