#!/usr/bin/env node
/**
 * Cross-platform protobuf → TypeScript generation (ts-proto).
 *
 * Replaces the old `grpc_tools_node_protoc ... && sed -i ...` pipeline so it works on
 * Windows/macOS/Linux and behind restrictive networks:
 *
 *  1. Expands `protos/*.proto` in Node (Windows shells do not expand globs).
 *  2. Tries, in order, a compiler that can run the ts-proto plugin:
 *       a. `grpc_tools_node_protoc` (from the grpc-tools package — the classic toolchain),
 *       b. a system `protoc` on PATH,
 *       c. `buf` (from @bufbuild/buf — a self-contained compiler from the npm registry).
 *  3. Prepends `//@ts-nocheck` to every generated file (replaces `sed -i '1i...'`,
 *     which is not portable to macOS/Windows).
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const messagesDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const isWin = process.platform === "win32";

const binDir = path.join(messagesDir, "node_modules", ".bin");
const tsProtoPlugin = path.join(messagesDir, "node_modules", "ts-proto", "protoc-gen-ts_proto");

const protosDir = path.join(messagesDir, "protos");
const protos = fs
    .readdirSync(protosDir)
    .filter((f) => f.endsWith(".proto"))
    .sort()
    .map((f) => path.join("protos", f));

const outDir = path.resolve(messagesDir, "..", "libs", "messages", "src", "ts-proto-generated");
fs.mkdirSync(outDir, { recursive: true });

const TS_PROTO_OPTS = ["outputServices=grpc-js", "oneof=unions", "esModuleInterop=true"];

function tryCommand(label, cmd, args, extraEnv = {}) {
    console.log(`[gen-proto] trying ${label}: ${path.basename(cmd)} ${args.join(" ")}`);
    const result = spawnSync(cmd, args, {
        cwd: messagesDir,
        stdio: "inherit",
        shell: isWin && cmd.endsWith(".cmd"),
        env: { ...process.env, ...extraEnv },
    });
    return result.status === 0;
}

function tryGrpcTools() {
    const bin = path.join(binDir, isWin ? "grpc_tools_node_protoc.cmd" : "grpc_tools_node_protoc");
    if (!fs.existsSync(bin)) return false;
    // Skip silently when the native protoc binary is missing (e.g. install scripts were
    // skipped or its download was blocked) and fall back to the next compiler.
    const probe = spawnSync(bin, ["--version"], { cwd: messagesDir, shell: isWin, encoding: "utf8" });
    if (probe.status !== 0) {
        console.log("[gen-proto] grpc_tools_node_protoc is not usable here, trying alternatives...");
        return false;
    }
    const args = [
        `--plugin=protoc-gen-ts_proto=${tsProtoPlugin}`,
        `--ts_proto_out=${outDir}`,
        ...TS_PROTO_OPTS.map((o) => `--ts_proto_opt=${o}`),
        "-I",
        "protos",
        ...protos,
    ];
    return tryCommand("grpc_tools_node_protoc", bin, args);
}

function trySystemProtoc() {
    const probe = spawnSync("protoc", ["--version"], { shell: isWin, encoding: "utf8" });
    if (probe.status !== 0) return false;
    const args = [
        `--plugin=protoc-gen-ts_proto=${tsProtoPlugin}`,
        `--ts_proto_out=${outDir}`,
        ...TS_PROTO_OPTS.map((o) => `--ts_proto_opt=${o}`),
        "-I",
        "protos",
        ...protos,
    ];
    return tryCommand("system protoc", "protoc", args);
}

function tryBuf() {
    const buf = path.join(binDir, isWin ? "buf.cmd" : "buf");
    const hasLocal = fs.existsSync(buf);
    const probe = spawnSync(hasLocal ? buf : "buf", ["--version"], { shell: isWin, encoding: "utf8" });
    if (probe.status !== 0) return false;

    const template = path.join(os.tmpdir(), `wa-buf-gen-${process.pid}.yaml`);
    fs.writeFileSync(
        template,
        [
            "version: v2",
            "plugins:",
            `  - local: ["node", ${JSON.stringify(tsProtoPlugin)}]`,
            `    out: ${JSON.stringify(outDir)}`,
            "    opt:",
            ...TS_PROTO_OPTS.map((o) => `      - ${o}`),
            "",
        ].join("\n"),
    );
    try {
        return tryCommand("buf", hasLocal ? buf : "buf", ["generate", "--template", template, "protos"]);
    } finally {
        fs.rmSync(template, { force: true });
    }
}

let ok = tryGrpcTools() || trySystemProtoc() || tryBuf();
if (!ok) {
    console.error(
        "[gen-proto] FAILED: no protobuf compiler available.\n" +
            "  Install one of:\n" +
            "   - `npm install` in messages/ with network access to node-precompiled-binaries.grpc.io (grpc-tools),\n" +
            "   - `protoc` on your PATH (e.g. `apt install protobuf-compiler` / `brew install protobuf`),\n" +
            "   - `npm install --no-save @bufbuild/buf` in messages/.",
    );
    process.exit(1);
}

let count = 0;
for (const file of fs.readdirSync(outDir)) {
    if (!file.endsWith(".ts")) continue;
    const filePath = path.join(outDir, file);
    const content = fs.readFileSync(filePath, "utf8");
    if (!content.startsWith("//@ts-nocheck")) {
        fs.writeFileSync(filePath, "//@ts-nocheck\n" + content);
    }
    count++;
}
console.log(`[gen-proto] done: ${count} generated file(s) in ${outDir}`);
