// Repro: after a camera off/on, a LiveKit subscriber that cannot decode VP9 (so it gets the VP8 backup codec)
// never gets the publisher's camera back.
// 4 users (MAX_USERS_FOR_WEBRTC=3 on the socle's back, so the bubble goes to LiveKit):
//   Alice publishes her camera; Vic announces neither VP9 nor AV1 (stripped from the SFU's offers);
//   Bob and Carol are VP9-capable witnesses. Only Alice has her camera on.
// Usage: [RELAY=1] [RESUME=1] OUT=<dir> TAG=before|after node backup-codec-repro.mjs <roomUrl>
// RELAY=1: the camera goes through a MediaStreamTrackGenerator, as with a background effect.
// RESUME=1: two LiveKit signal drops (resumed sessions) between the camera off and on.
import fs from "fs";
import { chromium } from "playwright";

const url = process.argv[2];
const OUT = process.env.OUT ?? ".";
const TAG = process.env.TAG ?? "run";
fs.mkdirSync(OUT, { recursive: true });
const t0 = Date.now();
const stamp = () => `${((Date.now() - t0) / 1000).toFixed(1)}s`;

const browser = await chromium.launch({
    headless: true,
    channel: "chromium",
    args: [
        "--use-fake-device-for-media-stream",
        "--use-fake-ui-for-media-stream",
        "--autoplay-policy=no-user-gesture-required",
    ],
});

// Runs in every page: keeps the RTCPeerConnections and the track clones, and optionally strips codecs from the
// offers the SFU sends, as a browser that cannot decode them would never accept them.
function initScript({ strip, blur, relay }) {
    // Background blur: the camera reaches LiveKit through a MediaStreamTrackGenerator
    if (blur && location.hostname.startsWith("play.")) {
        localStorage.setItem("backgroundMode", "blur");
        localStorage.setItem("backgroundBlurAmount", "15");
    }
    // Relay: the camera reaches LiveKit through a MediaStreamTrackGenerator, as with a background effect. Once the
    // camera is stopped, the generator's writable closes and every track of that generator (clones included) ends.
    if (relay && location.hostname.startsWith("play.")) {
        const getUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        navigator.mediaDevices.getUserMedia = async (constraints) => {
            const stream = await getUserMedia(constraints);
            const source = stream.getVideoTracks()[0];
            if (!source) return stream;
            const processor = new MediaStreamTrackProcessor({ track: source });
            const generator = new MediaStreamTrackGenerator({ kind: "video" });
            const info = { frames: 0, at: Date.now(), stoppedAt: null, error: null, generator };
            (window.__gens ??= []).push(info);
            processor.readable
                .pipeThrough(new TransformStream({ transform(frame, c) { info.frames++; c.enqueue(frame); } }))
                .pipeTo(generator.writable)
                .catch((e) => (info.error = String(e)));
            const stop = generator.stop.bind(generator);
            generator.stop = () => {
                info.stoppedAt = Date.now();
                info.stack = new Error().stack.split("\n").slice(2, 7).join(" | ");
                source.stop();
                stop();
            };
            return new MediaStream([generator, ...stream.getAudioTracks()]);
        };
    }
    window.__pcs = [];
    const OriginalPC = window.RTCPeerConnection;
    window.RTCPeerConnection = function (...args) {
        const pc = new OriginalPC(...args);
        window.__pcs.push(pc);
        return pc;
    };
    window.RTCPeerConnection.prototype = OriginalPC.prototype;
    Object.setPrototypeOf(window.RTCPeerConnection, OriginalPC);

    // LiveKit signal sockets, to cut them as a network drop would (livekit-client then resumes the session)
    window.__signalSockets = [];
    const OriginalWebSocket = window.WebSocket;
    window.WebSocket = function (url, protocols) {
        const socket = new OriginalWebSocket(url, protocols);
        if (String(url).includes("/rtc")) window.__signalSockets.push(socket);
        return socket;
    };
    window.WebSocket.prototype = OriginalWebSocket.prototype;
    Object.setPrototypeOf(window.WebSocket, OriginalWebSocket);

    window.__clones = [];
    const clone = MediaStreamTrack.prototype.clone;
    MediaStreamTrack.prototype.clone = function () {
        const copy = clone.call(this);
        if (copy.kind === "video") window.__clones.push({ track: copy, from: this.id, at: Date.now() });
        return copy;
    };

    if (!strip.length) return;
    const stripCodecs = (sdp) => {
        const lines = sdp.split("\r\n");
        const drop = new Set();
        for (const line of lines) {
            const m = line.match(/^a=rtpmap:(\d+) ([^/]+)\//);
            if (m && strip.includes(m[2].toUpperCase())) drop.add(m[1]);
        }
        for (const line of lines) {
            const m = line.match(/^a=fmtp:(\d+) apt=(\d+)/);
            if (m && drop.has(m[2])) drop.add(m[1]);
        }
        return lines
            .filter((line) => {
                const m = line.match(/^a=(rtpmap|fmtp|rtcp-fb):(\d+)[ ]/);
                return !(m && drop.has(m[2]));
            })
            .map((line) =>
                line.startsWith("m=video")
                    ? line
                          .split(" ")
                          .filter((part, i) => i < 3 || !drop.has(part))
                          .join(" ")
                    : line,
            )
            .join("\r\n");
    };
    // livekit-client uses a single peer connection by default: the client offers, with recvonly transceivers.
    const allowed = () =>
        RTCRtpReceiver.getCapabilities("video").codecs.filter(
            (codec) => !strip.includes(codec.mimeType.split("/")[1].toUpperCase()),
        );
    const addTransceiver = OriginalPC.prototype.addTransceiver;
    OriginalPC.prototype.addTransceiver = function (trackOrKind, init) {
        const transceiver = addTransceiver.call(this, trackOrKind, init);
        const kind = typeof trackOrKind === "string" ? trackOrKind : trackOrKind.kind;
        if (kind === "video") transceiver.setCodecPreferences(allowed());
        window.__filteredTransceivers = (window.__filteredTransceivers ?? 0) + (kind === "video" ? 1 : 0);
        return transceiver;
    };
    const setRemoteDescription = OriginalPC.prototype.setRemoteDescription;
    OriginalPC.prototype.setRemoteDescription = function (description, ...rest) {
        if (description?.type === "offer" && description.sdp) {
            description = { type: "offer", sdp: stripCodecs(description.sdp) };
        }
        const result = setRemoteDescription.call(this, description, ...rest);
        // Transceivers created by a remote offer
        return result.then((value) => {
            for (const transceiver of this.getTransceivers()) {
                if (transceiver.receiver.track.kind === "video" && transceiver.direction !== "sendonly") {
                    try {
                        transceiver.setCodecPreferences(allowed());
                    } catch {
                        // stopped transceiver
                    }
                }
            }
            return value;
        });
    };
    const createOffer = OriginalPC.prototype.createOffer;
    OriginalPC.prototype.createOffer = async function (...args) {
        const offer = await createOffer.apply(this, args);
        window.__offersWithVp9 = (window.__offersWithVp9 ?? 0) + (/VP9|AV1/.test(offer.sdp) ? 1 : 0);
        return offer;
    };
}

async function join(name, strip = [], blur = false, relay = false) {
    const context = await browser.newContext({
        bypassCSP: true,
        locale: "en-US",
        permissions: ["camera", "microphone"],
        viewport: { width: 1280, height: 800 },
    });
    const page = await context.newPage();
    page.on("console", (msg) => {
        if (msg.type() === "error" || /background|blur|generator|pipe/i.test(msg.text())) {
            fs.appendFileSync(`${OUT}/${TAG}-${name}-console.log`, `${stamp()} ${msg.type()}: ${msg.text().slice(0, 300)}\n`);
        }
    });
    page.on("pageerror", (err) => fs.appendFileSync(`${OUT}/${TAG}-${name}-console.log`, `${stamp()} pageerror: ${err.message}\n`));
    await page.addInitScript(initScript, { strip, blur, relay });
    for (const id of ["onboarding-button-welcome-skip", "no-microphone-sound-ignore", "pwa-install-skip"]) {
        await page.addLocatorHandler(page.getByTestId(id), async () => {
            await page.getByTestId(id).click({ force: true }).catch(() => undefined);
        });
    }
    await page.goto(url, { timeout: 240_000, waitUntil: "domcontentloaded" });
    await page.getByTestId("loginSceneNameInput").fill(name, { timeout: 240_000 });
    await page.getByTestId("loginSceneNameInput").press("Enter");
    await page.locator("button.selectCharacterSceneFormSubmit").click({ timeout: 90_000 });
    await page.getByRole("button", { name: "Save" }).click({ timeout: 90_000 });
    await page.getByTestId("microphone-button").waitFor({ timeout: 120_000 });
    await page.waitForTimeout(2000);
    return page;
}

const isOn = async (page, id) => !((await page.getByTestId(id).getAttribute("class")) ?? "").includes("bg-danger");
async function setCamera(page, on) {
    if ((await isOn(page, "camera-button")) !== on) await page.getByTestId("camera-button").click({ force: true });
}

// Video RTP received per codec, as frames decoded over the next 3 s
async function inbound(page) {
    const read = () =>
        page.evaluate(async () => {
            const out = {};
            for (const pc of window.__pcs) {
                if (pc.connectionState === "closed") continue;
                const report = await pc.getStats();
                const codecs = new Map();
                report.forEach((s) => s.type === "codec" && codecs.set(s.id, s.mimeType));
                report.forEach((s) => {
                    if (s.type !== "inbound-rtp" || s.kind !== "video") return;
                    out[s.id] = { codec: codecs.get(s.codecId) ?? "none", frames: s.framesDecoded ?? 0, bytes: s.bytesReceived ?? 0 };
                });
            }
            return out;
        });
    const first = await read();
    await page.waitForTimeout(3000);
    const second = await read();
    const perCodec = {};
    for (const [id, s] of Object.entries(second)) {
        const before = first[id] ?? { frames: 0, bytes: 0 };
        const key = s.codec;
        perCodec[key] ??= { framesIn3s: 0, kbIn3s: 0 };
        perCodec[key].framesIn3s += s.frames - before.frames;
        perCodec[key].kbIn3s += Math.round((s.bytes - before.bytes) / 1000);
    }
    return perCodec;
}

async function outbound(page) {
    return page.evaluate(async () => {
        const out = {};
        for (const pc of window.__pcs) {
            if (pc.connectionState === "closed") continue;
            const report = await pc.getStats();
            const codecs = new Map();
            report.forEach((s) => s.type === "codec" && codecs.set(s.id, s.mimeType));
            report.forEach((s) => {
                if (s.type !== "outbound-rtp" || s.kind !== "video") return;
                const key = codecs.get(s.codecId) ?? "none";
                out[key] = (out[key] ?? 0) + (s.framesEncoded ?? 0);
            });
        }
        return out;
    });
}

const clones = (page) =>
    page.evaluate(() => window.__clones.map((c) => ({ readyState: c.track.readyState, from: c.from.slice(0, 8), ageS: Math.round((Date.now() - c.at) / 1000) })));
const red = (page) => page.getByText("No video stream received.").count();

async function snapshot(label) {
    const result = {
        label,
        at: stamp(),
        aliceCameraButton: (await isOn(alice, "camera-button")) ? "on" : "off",
        aliceFramesEncodedPerCodec: await outbound(alice),
        aliceVideoClones: await clones(alice),
        aliceRelays: await alice.evaluate(() => (window.__gens ?? []).map((g) => ({ frames: g.frames, ageS: Math.round((Date.now() - g.at) / 1000), stoppedAfterS: g.stoppedAt && Math.round((g.stoppedAt - g.at) / 1000), state: g.generator.readyState, error: g.error, stack: g.stack?.slice(0, 400) }))),
        vicFilter: await vic.evaluate(() => ({ transceivers: window.__filteredTransceivers, offersWithVp9: window.__offersWithVp9 })),
        vicReceives: await inbound(vic),
        bobReceives: await inbound(bob),
        redOnVic: await red(vic),
        redOnBob: await red(bob),
    };
    console.log(JSON.stringify(result, null, 2));
    await vic.screenshot({ path: `${OUT}/${TAG}-${label}-vic.png` });
    return result;
}

const bob = await join("Bob");
const carol = await join("Carol");
const vic = await join("Vic", ["VP9", "AV1"]);
const alice = await join("Alice", [], process.env.BLUR === "1", process.env.RELAY === "1");
for (const page of [bob, carol, vic]) await setCamera(page, false);
await setCamera(alice, true);
await alice
    .waitForFunction(() => (window.e2eHooks?.getLivekitConnectionsCount?.() ?? 0) > 0, null, { timeout: 90_000 })
    .catch(() => console.log("LiveKit never connected on Alice"));
await alice.waitForTimeout(15_000);
await alice.screenshot({ path: `${OUT}/${TAG}-alice-start.png` });
const results = [await snapshot("1-camera-on")];

await setCamera(alice, false);
await alice.waitForTimeout(8_000);
results.push(await snapshot("2-camera-off"));

if (process.env.RESUME === "1") {
    // As Christophe's two RR_SIGNAL_DISCONNECTED between his camera off and on
    for (let i = 0; i < 2; i++) {
        const closed = await alice.evaluate(() => {
            const open = window.__signalSockets.filter((socket) => socket.readyState === WebSocket.OPEN);
            open.forEach((socket) => socket.close(4000, "simulated network drop"));
            return open.length;
        });
        console.log(`${stamp()} closed ${closed} LiveKit signal socket(s)`);
        await alice.waitForTimeout(8_000);
    }
    console.log(`${stamp()} open signal sockets: ${await alice.evaluate(() => window.__signalSockets.filter((s) => s.readyState === WebSocket.OPEN).length)}, livekit connections: ${await alice.evaluate(() => window.e2eHooks?.getLivekitConnectionsCount?.())}`);
}

await setCamera(alice, true);
await alice.waitForTimeout(15_000);
results.push(await snapshot("3-camera-on-again"));

fs.writeFileSync(`${OUT}/${TAG}.json`, JSON.stringify(results, null, 2));
await browser.close();
