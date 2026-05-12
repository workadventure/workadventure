import { a as E, r as f } from "./browser-runtime-options-szKHyy8v.js";
const M = new URL("assets/audio-worklet-processor.js", import.meta.url).href, m = "workadventure-noise-suppression", h = 3e4, l = /* @__PURE__ */ new WeakMap();
function w(e, s) {
  let r = l.get(e);
  r || (r = /* @__PURE__ */ new Map(), l.set(e, r));
  const o = r.get(s);
  if (o)
    return o;
  const a = e.audioWorklet.addModule(s);
  return r.set(s, a), a;
}
function v(e) {
  return e.type === "ready";
}
function g(e) {
  return e.type === "error";
}
function y(e) {
  return e.type === "benchmark-complete";
}
function k(e, s) {
  return new Promise((r, o) => {
    const a = globalThis.setTimeout(() => {
      n(), o(new Error("Timed out waiting for the noise suppression worklet to initialize."));
    }, s), u = (t) => {
      const i = t.data;
      if (v(i)) {
        n(), r(i);
        return;
      }
      g(i) && (n(), o(new Error(i.message)));
    }, c = () => {
      n(), o(new Error("The noise suppression AudioWorklet processor failed."));
    }, n = () => {
      globalThis.clearTimeout(a), e.port.removeEventListener("message", u), e.removeEventListener("processorerror", c);
    };
    e.port.addEventListener("message", u), e.port.start(), e.addEventListener("processorerror", c);
  });
}
async function L(e, s = {}) {
  const r = s.moduleUrl ?? M, o = s.readyTimeoutMs ?? h, a = E(s.threads), u = f(s.numThreads), c = s.bypassUntilReady ?? !0;
  await w(e, r);
  const n = {
    threads: a,
    numThreads: u,
    bypassUntilReady: c
  }, t = new AudioWorkletNode(
    e,
    m,
    {
      channelCount: 1,
      channelCountMode: "explicit",
      numberOfInputs: 1,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: n
    }
  ), i = k(t, o);
  return {
    node: t,
    ready: i,
    moduleUrl: r,
    processorName: m,
    dispose() {
      const p = {
        type: "dispose"
      };
      t.port.postMessage(p), t.disconnect();
    }
  };
}
function S(e, s) {
  const r = (o) => {
    s(o.data);
  };
  return e.node.port.addEventListener("message", r), e.node.port.start(), () => {
    e.node.port.removeEventListener("message", r);
  };
}
function b(e) {
  return e.type === "processing-started";
}
async function O(e, s = {}) {
  const r = s.warmupIterations ?? 40, o = s.benchmarkIterations ?? 300;
  return await e.ready, new Promise(
    (a, u) => {
      const c = (p) => {
        const d = p.data;
        if (y(d)) {
          t(), a(d);
          return;
        }
        g(d) && (t(), u(new Error(d.message)));
      }, n = () => {
        t(), u(new Error("The noise suppression AudioWorklet processor failed."));
      }, t = () => {
        e.node.port.removeEventListener("message", c), e.node.removeEventListener("processorerror", n);
      };
      e.node.port.addEventListener("message", c), e.node.port.start(), e.node.addEventListener("processorerror", n);
      const i = {
        type: "start-benchmark",
        warmupIterations: r,
        benchmarkIterations: o
      };
      e.node.port.postMessage(i);
    }
  );
}
export {
  m as NOISE_SUPPRESSION_AUDIO_WORKLET_PROCESSOR_NAME,
  L as createNoiseSuppressionAudioWorklet,
  b as isNoiseSuppressionProcessingStartedMessage,
  S as observeNoiseSuppressionAudioWorkletMessages,
  O as runNoiseSuppressionAudioWorkletBenchmark
};
//# sourceMappingURL=audio-worklet.js.map
