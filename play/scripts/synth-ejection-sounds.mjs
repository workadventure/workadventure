// Generates the sounds of the kick and ban scenes (play/public/resources/objects/emotes/kick-*.mp3 and
// banned.mp3) from code: oscillators, filtered noise and envelopes, nothing recorded or downloaded, so
// there is no licence to track. Run it from play/ with `node scripts/synth-ejection-sounds.mjs`; it
// needs ffmpeg on the PATH to encode the mp3 files.
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const SR = 22050;
const OUTPUT = "public/resources/objects/emotes";

const buffer = (seconds) => new Float32Array(Math.ceil(SR * seconds));

/** Exponential attack then exponential decay, like a WebAudio gain with two exponential ramps. */
function envelope(t, peak, attack, decay) {
    const floor = 0.0001;
    if (t < 0) return 0;
    if (t < attack) return floor * Math.pow(peak / floor, t / attack);
    const d = t - attack;
    if (d > decay) return 0;
    return peak * Math.pow(floor / peak, d / decay);
}

const ramp = (from, to, duration, t) => (t >= duration ? to : from * Math.pow(to / from, t / duration));

const WAVES = {
    sine: (phase) => Math.sin(2 * Math.PI * phase),
    square: (phase) => (phase % 1 < 0.5 ? 1 : -1),
    triangle: (phase) => 1 - 4 * Math.abs((phase % 1) - 0.5),
};

function tone(out, { type, from, to, duration, peak, delay = 0, vibrato }) {
    let phase = 0;
    const start = Math.floor(delay * SR);
    for (let i = 0; i < Math.ceil((duration + 0.05) * SR) && start + i < out.length; i++) {
        const t = i / SR;
        let frequency = ramp(from, to, duration, t);
        if (vibrato) frequency += vibrato.depth * Math.sin(2 * Math.PI * vibrato.rate * t);
        phase += frequency / SR;
        out[start + i] += WAVES[type](phase) * envelope(t, peak, 0.005, duration);
    }
}

/** White noise through a biquad filter whose cutoff sweeps exponentially. */
function noise(out, { duration, peak, filter, from, to, delay = 0 }) {
    const start = Math.floor(delay * SR);
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    for (let i = 0; i < Math.ceil(duration * SR) && start + i < out.length; i++) {
        const t = i / SR;
        const w0 = (2 * Math.PI * Math.min(ramp(from, to, duration, t), SR * 0.45)) / SR;
        const cos = Math.cos(w0);
        const alpha = Math.sin(w0) / 2;
        const [b0, b1, b2] =
            filter === "lowpass"
                ? [(1 - cos) / 2, 1 - cos, (1 - cos) / 2]
                : filter === "highpass"
                  ? [(1 + cos) / 2, -(1 + cos), (1 + cos) / 2]
                  : [alpha, 0, -alpha];
        const x = Math.random() * 2 - 1;
        const y = (b0 * x + b1 * x1 + b2 * x2 + 2 * cos * y1 - (1 - alpha) * y2) / (1 + alpha);
        x2 = x1;
        x1 = x;
        y2 = y1;
        y1 = y;
        out[start + i] += y * envelope(t, peak, 0.004, duration);
    }
}

function hit() {
    const out = buffer(0.26);
    tone(out, { type: "sine", from: 260, to: 70, duration: 0.18, peak: 0.5 });
    noise(out, { duration: 0.07, peak: 0.35, filter: "lowpass", from: 1400, to: 400 });
    return out;
}

/** A slide whistle going up, the cartoon sound of being sent flying. */
function whistle() {
    const out = buffer(1.0);
    tone(out, { type: "sine", from: 480, to: 1500, duration: 0.95, peak: 0.18, vibrato: { rate: 11, depth: 22 } });
    noise(out, { duration: 0.8, peak: 0.08, filter: "bandpass", from: 2400, to: 900 });
    return out;
}

function ding() {
    const out = buffer(0.68);
    tone(out, { type: "triangle", from: 2093, to: 2080, duration: 0.6, peak: 0.22 });
    tone(out, { type: "sine", from: 3136, to: 3120, duration: 0.45, peak: 0.1, delay: 0.01 });
    return out;
}

/** A short, dull thud: landing on the floor. */
function land() {
    const out = buffer(0.26);
    tone(out, { type: "sine", from: 140, to: 55, duration: 0.18, peak: 0.5 });
    noise(out, { duration: 0.12, peak: 0.25, filter: "lowpass", from: 500, to: 150 });
    return out;
}

/** The clang of the cell, the rattle of the bars and the fall, timed for the ban scene. */
function banned() {
    const out = buffer(1.98);
    [313, 587, 1033, 1627, 2560].forEach((frequency, i) =>
        tone(out, {
            type: i % 2 ? "square" : "sine",
            from: frequency,
            to: frequency * 0.99,
            duration: 0.9 - i * 0.12,
            peak: 0.12 - i * 0.015,
        }),
    );
    noise(out, { duration: 0.06, peak: 0.4, filter: "highpass", from: 3000, to: 1500 });
    for (let i = 0; i < 6; i++) {
        noise(out, { duration: 0.035, peak: 0.18, filter: "bandpass", from: 3200, to: 2600, delay: 0.22 + i * 0.14 });
    }
    tone(out, { type: "sine", from: 190, to: 42, duration: 0.7, peak: 0.4, delay: 1.23 });
    noise(out, { duration: 0.5, peak: 0.06, filter: "lowpass", from: 600, to: 120, delay: 1.28 });
    return out;
}

const peakOf = (samples) => samples.reduce((max, v) => Math.max(max, Math.abs(v)), 0);

function encode(name, samples, gain) {
    const data = Buffer.alloc(samples.length * 2);
    samples.forEach((v, i) => data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v * gain)) * 32767), i * 2));
    const header = Buffer.alloc(44);
    header.write("RIFF", 0);
    header.writeUInt32LE(36 + data.length, 4);
    header.write("WAVE", 8);
    header.write("fmt ", 12);
    header.writeUInt32LE(16, 16);
    header.writeUInt16LE(1, 20);
    header.writeUInt16LE(1, 22);
    header.writeUInt32LE(SR, 24);
    header.writeUInt32LE(SR * 2, 28);
    header.writeUInt16LE(2, 32);
    header.writeUInt16LE(16, 34);
    header.write("data", 36);
    header.writeUInt32LE(data.length, 40);
    const wav = join(workdir, `${name}.wav`);
    writeFileSync(wav, Buffer.concat([header, data]));
    const ffmpeg = spawnSync(
        "ffmpeg",
        [
            "-loglevel",
            "error",
            "-y",
            "-i",
            wav,
            "-ac",
            "1",
            "-ar",
            String(SR),
            "-b:a",
            "48k",
            join(OUTPUT, `${name}.mp3`),
        ],
        {
            stdio: "inherit",
        },
    );
    if (ffmpeg.status !== 0) throw new Error(`ffmpeg failed on ${name}`);
}

const workdir = mkdtempSync(join(tmpdir(), "ejection-sounds-"));
try {
    // The kick's cues share one gain, so that they keep their loudness relative to one another: the
    // whistle stays below the blow. Normalising each file on its own would make them all as loud.
    const cues = { "kick-hit": hit(), "kick-whistle": whistle(), "kick-ding": ding(), "kick-land": land() };
    const gain = 0.89 / Math.max(...Object.values(cues).map(peakOf));
    for (const [name, samples] of Object.entries(cues)) encode(name, samples, gain);
    const ban = banned();
    encode("banned", ban, 0.89 / peakOf(ban));
} finally {
    rmSync(workdir, { recursive: true, force: true });
}
