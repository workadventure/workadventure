const o = "./vendor/litert/", e = "./assets/model_quant_1.tflite", a = "./assets/model_quant_2.tflite";
function t(r) {
  return /^(https?:)?\/\//.test(r) || r.startsWith("/") ? r : new URL(r, import.meta.url).toString();
}
function i(r) {
  return typeof r == "boolean" ? r : typeof globalThis.crossOriginIsolated == "boolean" && globalThis.crossOriginIsolated;
}
function s(r) {
  if (Number.isFinite(r) && r !== void 0 && r > 0)
    return Math.floor(r);
  const n = typeof navigator < "u" && Number.isFinite(navigator.hardwareConcurrency) && navigator.hardwareConcurrency > 0 ? navigator.hardwareConcurrency : 1;
  return Math.max(1, Math.min(4, n));
}
function l() {
  return t(o);
}
function u() {
  return t(e);
}
function c() {
  return t(a);
}
export {
  i as a,
  c as b,
  u as c,
  l as d,
  s as r
};
//# sourceMappingURL=browser-runtime-options-szKHyy8v.js.map
