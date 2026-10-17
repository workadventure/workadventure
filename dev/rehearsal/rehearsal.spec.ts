// @ts-nocheck (the WA object only exists inside the script frame of the map)
// Rehearsal of the first production switch: two anonymous users stay on one map (and in one bubble) while the Helm
// release goes TS -> Go -> TS. Run by rehearse.sh. Measures what a user lives: how long until the two see each
// other moving again, whether a reload was needed, whether someone is there twice, whether the data comes back.
import { execFileSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { evaluateScript } from "../../tests/tests/utils/scripting";
import { dismissPwaInstallScreenIfShown } from "../../tests/tests/utils/pwaInstall";
import { dismissNoBrowserSoundInfoToast } from "../../tests/tests/utils/doNotDisturbInfoToast";

const DIR = __dirname;
const RUN = process.env.RUN ?? new Date().toISOString().slice(0, 10).replaceAll("-", "");
const REPORT = process.env.REPORT ?? path.join(DIR, "results", `${RUN}.md`);
const ONLY_TS = process.env.ONLY_TS === "1"; // debugging: stop after the first phase
const BASE = "https://play-rehearsal.localhost";
const ROOM = `${BASE}/_/rh${RUN}/maps-rehearsal.localhost/tests/Variables/empty_with_variable.json`;
const ROOM_KEY = "empty_with_variable.json"; // the Redis hash is at the room URL

const t0 = Date.now();
const secs = (ms: number) => Math.round(ms) / 1000;
const now = () => secs(Date.now() - t0);
const timeline: string[] = [];
const checks: string[] = [];
const measures: Record<string, string>[] = [];
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const note = (msg: string) => {
    const line = `- +${now().toFixed(1)}s ${msg}`;
    console.log(line);
    timeline.push(line);
};
const check = (what: string, ok: boolean | "info", detail = "") => {
    const line = `| ${what} | ${ok === "info" ? "info" : ok ? "OK" : "**KO**"} | ${detail.replaceAll("|", "/")} |`;
    console.log(line);
    checks.push(line);
};
const sh = (file: string, args: string[], env = {}) =>
    execFileSync(path.join(DIR, file), args, { env: { ...process.env, RUN, ...env }, encoding: "utf8" }).trim();
const data = (...args: string[]) => sh("data.sh", args);

async function withTimeout<T>(p: Promise<T>, ms = 6000): Promise<T | null> {
    let timer;
    const timeout = new Promise<null>((r) => (timer = setTimeout(() => r(null), ms)));
    try {
        return await Promise.race([p.catch(() => null), timeout]);
    } finally {
        clearTimeout(timer);
    }
}

// ---- users -----------------------------------------------------------------------------------------------------
type Tab = { page: Page; name: string; navigations: number; sockets: string[] };

async function join(browser, name: string): Promise<Tab> {
    const page = await (await browser.newContext()).newPage();
    page.setDefaultTimeout(60_000);
    const tab: Tab = { page, name, navigations: 0, sockets: [] };
    page.on("framenavigated", (f) => f === page.mainFrame() && tab.navigations++);
    page.on("websocket", (ws) => {
        const opened = now();
        ws.on("close", () => tab.sockets.push(`${name}: socket ${new URL(ws.url()).host} open +${opened}s, closed +${now()}s`));
    });
    await page.goto(ROOM);
    const input = page.getByTestId("loginSceneNameInput");
    await input.fill(name);
    await input.press("Enter");
    await expect(page.locator("button.selectCharacterSceneFormSubmit")).toBeVisible();
    await page.click("button.selectCharacterSceneFormSubmit");
    // createUser clicks "Save" at once and the user arrives without camera: wait for the stream first (dev/warm-auth.mjs).
    await page.locator("video").first().waitFor();
    await page.waitForTimeout(1000);
    await page.click("text=Save");
    await dismissPwaInstallScreenIfShown(page);
    await dismissNoBrowserSoundInfoToast(page);
    await page.addLocatorHandler(page.getByTestId("onboarding-button-welcome-skip"), async () => {
        await page.getByTestId("onboarding-button-welcome-skip").click().catch(() => {});
    });
    await expect(page.getByTestId("microphone-button")).toBeVisible({ timeout: 120_000 });
    await page.evaluate(() => (window.__rehearsal = true)); // gone if the document is reloaded
    return tab;
}

const move = (t: Tab, x: number, y = 160) =>
    evaluateScript(t.page, async ({ x, y }) => { await WA.onInit(); await WA.player.teleport(x, y); }, { x, y });
const seen = (t: Tab) =>
    evaluateScript(t.page, async () => {
        await WA.onInit();
        if (!window.__tracked) {
            await WA.players.configureTracking({ players: true, movement: true });
            window.__tracked = true; // a new script frame (page reload) tracks again
        }
        // list() is an iterator: its .map (iterator helpers) is another iterator, which serializes as {}
        return Array.from(WA.players.list(), (p) => ({ name: p.name, x: p.position?.x, y: p.position?.y }));
    });
const readVar = (t: Tab) =>
    withTimeout(evaluateScript(t.page, async () => { await WA.onInit(); return WA.state.textField; }));
const inBubble = async (t: Tab, other: string) =>
    (await t.page.locator("#cameras-container .camera-box", { hasText: other }).count().catch(() => 0)) > 0;
const banner = (t: Tab) => t.page.getByText("Connection to server lost").isVisible().catch(() => false);

// One step of the probe: both teleport (alternating positions), then each must read the other at the new place.
async function probe(a: Tab, b: Tab, i: number) {
    const ax = 150 + (i % 2) * 20, bx = 190 + (i % 2) * 20;
    await Promise.all([withTimeout(move(a, ax)), withTimeout(move(b, bx))]);
    await sleep(500);
    const [la, lb] = await Promise.all([withTimeout(seen(a)), withTimeout(seen(b))]);
    const at = (list, name, x) => list?.some((p) => p.name === name && Math.abs(p.x - x) <= 6) ?? false;
    return { ok: at(la, b.name, bx) && at(lb, a.name, ax), aSeesB: at(la, b.name, bx), bSeesA: at(lb, a.name, ax) };
}

// ---- the switch ------------------------------------------------------------------------------------------------
async function switchTo(browser, mode: "ts" | "go", tabs: { a: Tab; b: Tab }) {
    const m: Record<string, string> = { switch: `-> ${mode}` };
    const tStart = Date.now();
    note(`deploy.sh ${mode}: start`);
    const lines: string[] = [];
    const child = spawn(path.join(DIR, "deploy.sh"), [mode], { env: { ...process.env, RUN } });
    let exited: number | null = null;
    child.stdout.on("data", (d) => lines.push(...String(d).split("\n").filter(Boolean)));
    child.stderr.on("data", (d) => lines.push(...String(d).split("\n").filter(Boolean)));
    child.on("exit", (code) => { exited = Date.now(); note(`deploy.sh ${mode}: finished (exit ${code})`); });

    let firstFail: number | null = null, recovered: number | null = null, bannerAt: number | null = null, bannerGone: number | null = null;
    let streak = 0, i = 0, stage = "wait", reloaded = false, rejoined = false, deadline = Infinity;
    const trace: string[] = [];
    for (;;) {
        const r = await probe(tabs.a, tabs.b, i++);
        const t = Date.now();
        trace.push(`${secs(t - tStart)}s:${r.ok ? "ok" : r.aSeesB || r.bSeesA ? "half" : "ko"}`);
        const bn = await banner(tabs.a);
        if (bn && bannerAt === null) bannerAt = t;
        if (!bn && bannerAt !== null && bannerGone === null) bannerGone = t;
        if (!r.ok && firstFail === null) { firstFail = t; note(`first failed probe (${mode})`); }
        streak = r.ok ? streak + 1 : 0;
        if (r.ok && firstFail !== null && streak >= 2 && recovered === null) {
            recovered = t;
            note(`both see each other moving again (${stage === "wait" ? "no reload" : stage})`);
        }
        if (recovered !== null && exited !== null) break;
        // Ladder: wait 120 s after the deploy, then reload the tabs, then 120 s more, then rejoin from scratch.
        if (exited !== null && deadline === Infinity) deadline = exited + 120_000;
        if (Date.now() > deadline && recovered === null) {
            if (stage === "wait") {
                stage = "after reload"; reloaded = true; note("not recovered: reloading both tabs");
                await Promise.all([tabs.a.page.reload(), tabs.b.page.reload()]).catch(() => {});
                await Promise.all([tabs.a, tabs.b].map((x) => expect(x.page.getByTestId("microphone-button")).toBeVisible({ timeout: 90_000 }).catch(() => {})));
                deadline = Date.now() + 120_000; streak = 0;
            } else if (stage === "after reload") {
                stage = "after rejoin"; rejoined = true; note("still not recovered: closing the tabs and joining again");
                await tabs.a.page.context().close(); await tabs.b.page.context().close();
                tabs.a = await join(browser, "Alice"); tabs.b = await join(browser, "Bob");
                deadline = Date.now() + 120_000; streak = 0;
            } else { note("NOT RECOVERED, giving up"); break; }
        }
        if (Date.now() - tStart > 20 * 60_000) break;
    }
    while (exited === null) await sleep(500);
    const out = lines.join("\n");
    const helm = out.match(/== \w+: helm --wait (\d+)s, \/ping through the ingress (\d+)s/);
    note(`trace (${mode}): ${trace.join(" ")}`);
    const rel = (t: number | null) => (t === null ? "n/a" : `${secs(t - tStart)} s`);
    Object.assign(m, {
        "helm upgrade --wait": helm ? `${helm[1]} s` : "n/a",
        "/ping through the ingress": helm ? `${helm[2]} s after the start` : "n/a",
        "first failed probe": rel(firstFail),
        "both see each other moving": rel(recovered),
        "outage (first failed probe -> recovered)": firstFail && recovered ? `${secs(recovered - firstFail)} s` : "n/a",
        "after the end of deploy.sh": recovered ? `${secs(recovered - exited)} s` : "n/a",
        "'Connection to server lost' banner": bannerAt ? `shown +${secs(bannerAt - tStart)} s, gone ${rel(bannerGone)}` : "never seen",
        "manual reload needed": reloaded ? "YES" : "no",
        "rejoin from scratch needed": rejoined ? "YES" : "no",
    });
    measures.push(m);
    note(`deploy.sh ${mode} output:\n${out.split("\n").map((l) => "    " + l).join("\n")}`);
    return { recovered: recovered !== null, reloaded, rejoined };
}

// After a switch: bubble, duplicates, variable, data.
async function verify(browser, mode: "ts" | "go" | "ts2", tabs, readBack: { tag: string; value: string }[], newTag: string) {
    const { a, b } = tabs;
    // bubble: both teleport close to each other, as before.
    const t1 = Date.now();
    await Promise.all([withTimeout(move(a, 160)), withTimeout(move(b, 176))]);
    let bubble = false;
    while (!bubble && Date.now() - t1 < 60_000) { bubble = (await inBubble(a, "Bob")) && (await inBubble(b, "Alice")); if (!bubble) await sleep(500); }
    check(`${mode}: bubble formed again`, bubble, bubble ? `after ${secs(Date.now() - t1)} s` : "not within 60 s");
    // duplicates: a fresh observer lists the room; so do the two tabs.
    const carol = await join(browser, "Carol");
    await move(carol, 20, 20);
    await sleep(3000);
    for (const [who, tab] of [["Alice", a], ["Bob", b], ["Carol (new)", carol]] as const) {
        const list = (await withTimeout(seen(tab))) ?? [];
        const names = list.map((p) => p.name).sort();
        const dup = names.length !== new Set(names).size;
        check(`${mode}: ${who} sees ${names.join(", ") || "nobody"}`, !dup && names.length === 2, dup ? "DUPLICATE" : "");
    }
    // the document is the same (no reload)
    for (const tab of [a, b]) {
        const alive = await tab.page.evaluate(() => window.__rehearsal === true).catch(() => false);
        check(`${mode}: ${tab.name}'s document never reloaded`, alive && tab.navigations <= 1, `navigations: ${tab.navigations}, marker ${alive ? "kept" : "lost"}`);
    }
    // variables written earlier, read by the tab and by a fresh user
    for (const { tag, value } of readBack) {
        const [ta, tc] = [await readVar(a), await readVar(carol)];
        check(`${mode}: variable written by ${tag} read by a fresh user`, tc === value, `got ${JSON.stringify(tc)}, expected ${JSON.stringify(value)}`);
        check(`${mode}: ... and by Alice's tab`, ta === value, `got ${JSON.stringify(ta)}`);
    }
    // write a new value; the other tab and a fresh user must read it
    const value = `${newTag}-${RUN}`;
    const saved = await withTimeout(evaluateScript(a.page, async (v) => { await WA.onInit(); await WA.state.saveVariable("textField", v); return true; }, value), 15_000);
    await sleep(1500);
    const vb = await readVar(b);
    check(`${mode}: new variable written by ${newTag}`, saved === true && vb === value, `Bob reads ${JSON.stringify(vb)}`);
    const carol2 = await join(browser, "Dave");
    const vd = await readVar(carol2);
    check(`${mode}: ... a fresh user reads it`, vd === value, `got ${JSON.stringify(vd)}`);
    await carol.page.context().close();
    await carol2.page.context().close();
    note(`redis (${mode}):\n${data("redis", ROOM_KEY).split("\n").map((l) => "    " + l).join("\n")}`);
    return value;
}

function dataChecks(label: string, tags: string[], sharedBy: string) {
    for (const tag of tags) {
        for (const line of data("check", tag).split("\n")) {
            const mm = line.match(/^CHECK (\S+) (\S+) (OK|MISSING|DIFFERENT)(.*)$/);
            if (mm) check(`${label}: ${mm[1]} written by ${mm[2]} read back`, mm[3] === "OK", `${mm[3]}${mm[4]}`);
        }
    }
    const mm = data("check-shared", sharedBy).match(/^CHECK (\S+) (\S+) (OK|MISSING|DIFFERENT)(.*)$/);
    if (mm) check(`${label}: shared map edited by ${sharedBy} (last writer)`, mm[3] === "OK", `${mm[3]}${mm[4]}`);
}
function dataWrite(tag: string) {
    const out = data("write", tag);
    note(`data.sh write ${tag}:\n${out.split("\n").map((l) => "    " + l).join("\n")}`);
    for (const l of out.split("\n")) check(`${tag}: ${l.split(" ").slice(1, 3).join(" ")} written`, /HTTP 200|id=[0-9a-f]/.test(l), l);
}

// ---- the scenario ----------------------------------------------------------------------------------------------
test("TS -> Go -> TS with two users staying on the map", async ({ browser }) => {
    const tabs = {} as { a: Tab; b: Tab };
    try {
        note(`room ${ROOM}`);
        tabs.a = await join(browser, "Alice");
        tabs.b = await join(browser, "Bob");
        note("Alice and Bob joined on TypeScript");
        const base = await probe(tabs.a, tabs.b, 0);
        check("ts: the two see each other moving (baseline)", base.ok);
        const vTs = await verify(browser, "ts", tabs, [], "ts");
        dataWrite("ts");
        dataChecks("ts", ["ts"], "ts");
        if (ONLY_TS) return;

        // TS -> Go
        const toGo = await switchTo(browser, "go", tabs);
        check("go: the tabs recovered", toGo.recovered, `reload needed: ${toGo.reloaded}, rejoin needed: ${toGo.rejoined}`);
        const vGo = await verify(browser, "go", tabs, [{ tag: "ts", value: vTs }], "go");
        dataChecks("go", ["ts"], "ts");
        dataWrite("go");

        // Go -> TS (rollback)
        const toTs = await switchTo(browser, "ts", tabs);
        check("ts again: the tabs recovered", toTs.recovered, `reload needed: ${toTs.reloaded}, rejoin needed: ${toTs.rejoined}`);
        await verify(browser, "ts2", tabs, [{ tag: "go", value: vGo }], "ts2");
        dataChecks("ts2", ["ts", "go"], "go");
        dataWrite("ts2");
        for (const t of [tabs.a, tabs.b]) for (const s of t.sockets) note(s);
    } catch (e) {
        note(`SCENARIO ERROR: ${String(e).split("\n")[0]}`);
        throw e;
    } finally {
        // never leave the cluster on Go when the scenario broke in the middle: the next run starts from TS
        const cols = ["helm upgrade --wait", "/ping through the ingress", "first failed probe", "both see each other moving", "outage (first failed probe -> recovered)", "after the end of deploy.sh", "'Connection to server lost' banner", "manual reload needed", "rejoin from scratch needed"];
        const md = [
            `\n## Measures\n`,
            `| Measure | ${measures.map((m) => m.switch).join(" | ")} |`, `|---|${measures.map(() => "---").join("|")}|`,
            ...cols.map((c) => `| ${c} | ${measures.map((m) => m[c] ?? "").join(" | ")} |`),
            `\n## Results\n\n| Check | Result | Detail |\n|---|---|---|`, ...checks,
            `\n## Timeline\n`, ...timeline, "",
        ];
        fs.appendFileSync(REPORT, md.join("\n"));
    }
});
