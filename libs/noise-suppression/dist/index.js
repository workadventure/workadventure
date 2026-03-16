import le from "fft.js";
import { r as ue, a as fe, b as ce, c as de, d as pe } from "./browser-runtime-options-szKHyy8v.js";
async function he(e) {
  if (typeof importScripts == "function")
    importScripts(e.toString());
  else {
    const t = document.createElement("script");
    return t.src = e.toString(), t.crossOrigin = "anonymous", new Promise((r, n) => {
      t.addEventListener("load", () => {
        r();
      }, !1), t.addEventListener("error", (o) => {
        n(o);
      }, !1), document.body.appendChild(t);
    });
  }
}
var me = async (e, t, r, n, o) => {
  if (t && await he(t), !self.ModuleFactory)
    throw new Error("ModuleFactory not set.");
  const s = await self.ModuleFactory(self.Module || o);
  return self.ModuleFactory = self.Module = void 0, new e(s, n);
}, d = {
  NONE: 0,
  FLOAT32: 1,
  INT32: 2,
  UINT8: 3,
  INT64: 4,
  STRING: 5,
  BOOL: 6,
  INT16: 7,
  COMPLEX64: 8,
  INT8: 9,
  FLOAT16: 10,
  FLOAT64: 11,
  COMPLEX128: 12,
  UINT64: 13,
  RESOURCE: 14,
  VARIANT: 15,
  UINT32: 16,
  UINT16: 17,
  INT4: 18,
  BFLOAT16: 19
}, te = {
  [d.NONE]: "NONE",
  [d.FLOAT32]: "FLOAT32",
  [d.INT32]: "INT32",
  [d.UINT8]: "UINT8",
  [d.INT64]: "INT64",
  [d.STRING]: "STRING",
  [d.BOOL]: "BOOL",
  [d.INT16]: "INT16",
  [d.COMPLEX64]: "COMPLEX64",
  [d.INT8]: "INT8",
  [d.FLOAT16]: "FLOAT16",
  [d.FLOAT64]: "FLOAT64",
  [d.COMPLEX128]: "COMPLEX128",
  [d.UINT64]: "UINT64",
  [d.RESOURCE]: "RESOURCE",
  [d.VARIANT]: "VARIANT",
  [d.UINT32]: "UINT32",
  [d.UINT16]: "UINT16",
  [d.INT4]: "INT4",
  [d.BFLOAT16]: "BFLOAT16"
}, T = {
  HOST_MEMORY: 1,
  WEB_GPU_BUFFER: 20,
  WEB_GPU_BUFFER_FP16: 21,
  WEB_GPU_BUFFER_PACKED: 26
}, v = {
  [T.HOST_MEMORY]: "HOST_MEMORY",
  [T.WEB_GPU_BUFFER]: "WEB_GPU_BUFFER",
  [T.WEB_GPU_BUFFER_FP16]: "WEB_GPU_BUFFER_FP16",
  [T.WEB_GPU_BUFFER_PACKED]: "WEB_GPU_BUFFER_PACKED"
}, ye = Object.freeze([
  {
    dtype: "float32",
    typedArrayConstructor: Float32Array,
    elementType: d.FLOAT32
  },
  {
    dtype: "int32",
    typedArrayConstructor: Int32Array,
    elementType: d.INT32
  },
  {
    dtype: "uint8",
    typedArrayConstructor: Uint8Array,
    elementType: d.UINT8
  }
]);
function D(e) {
  for (const t of ye)
    if (t.dtype === e || t.typedArrayConstructor === e || e instanceof t.typedArrayConstructor || t.elementType === e)
      return t;
  throw typeof e == "string" ? new Error(`DType ${e} is not supported.`) : e instanceof Object ? new Error(`Typed array ${"name" in e ? e.name : e.constructor.name} is not supported.`) : new Error(
    `Element type ${te[e] ?? e} is not supported.`
  );
}
var Te = class extends Error {
  constructor() {
    super(
      "LiteRT is not initialized yet. Please call loadLiteRt() and wait for its promise to resolve to load the LiteRT WASM module."
    );
  }
}, C = void 0, k = void 0;
function w() {
  if (!C)
    throw new Te();
  return C;
}
function re(e) {
  C = e;
}
function x() {
  return k;
}
function ne() {
  return !!k;
}
function W(e) {
  k = e;
}
var we = {
  webgpu: T.WEB_GPU_BUFFER_PACKED,
  wasm: T.HOST_MEMORY
}, Re = {
  [T.HOST_MEMORY]: "wasm",
  [T.WEB_GPU_BUFFER]: "webgpu",
  [T.WEB_GPU_BUFFER_FP16]: "webgpu",
  [T.WEB_GPU_BUFFER_PACKED]: "webgpu"
}, Ee = [
  "shader-f16",
  "subgroups",
  // In origin trial
  "subgroups-f16"
  // In origin trial
], I = class oe {
  constructor(t) {
    this.options = t, this.liteRtEnvironment = w().liteRtWasm.LiteRtEnvironment.create(
      t.webGpuDevice
    );
  }
  liteRtEnvironment;
  static async create(t = {}) {
    let r = null;
    if ("webGpuDevice" in t)
      t.webGpuDevice && (r = t.webGpuDevice);
    else
      try {
        r = await ge();
      } catch (n) {
        console.warn("Failed to create default WebGPU device:", n);
      }
    return new oe({
      ...t,
      webGpuDevice: r
    });
  }
  get webGpuDevice() {
    return this.options.webGpuDevice;
  }
  delete() {
    this.liteRtEnvironment.delete();
  }
};
async function ge() {
  const e = {
    powerPreference: "high-performance"
  }, t = await navigator.gpu.requestAdapter(e);
  if (!t)
    throw new Error("No GPU adapter found.");
  const r = {
    maxBufferSize: t.limits.maxBufferSize,
    maxStorageBufferBindingSize: t.limits.maxStorageBufferBindingSize,
    maxStorageBuffersPerShaderStage: t.limits.maxStorageBuffersPerShaderStage,
    maxTextureDimension2D: t.limits.maxTextureDimension2D
  }, n = [];
  for (const o of Ee)
    t.features.has(o) && n.push(o);
  return await t.requestDevice({
    requiredFeatures: n,
    requiredLimits: r
  });
}
function M(e) {
  const t = new Array(e.size());
  for (let r = 0; r < e.size(); ++r)
    t[r] = e.get(r);
  return e.delete(), t;
}
function se(e, t) {
  for (const r of e)
    t.push_back(r);
}
function Be(e) {
  const t = e.shift(), r = w().liteRtWasm;
  if (t instanceof r.LiteRtTensorBuffer)
    return { liteRtTensorBuffer: t };
  if (typeof GPUBuffer < "u" && t instanceof GPUBuffer)
    return { gpuBuffer: t };
  if (ArrayBuffer.isView(t))
    return { typedArray: t };
  throw new Error(`Unknown type (${t?.constructor.name ?? t}) provided to create a Tensor`);
}
function be(e) {
  return Array.isArray(e[0]) || e[0] instanceof Int32Array ? { shape: e.shift() } : {};
}
function $(e) {
  for (; e.length > 0 && e[0] === void 0; )
    e.shift();
}
function Se(e) {
  if ($(e), typeof e[0] == "string") {
    const t = e.shift();
    return { dataType: D(t).dtype };
  } else
    return {};
}
function ve(e) {
  return $(e), e[0] instanceof I ? { environment: e.shift() } : {};
}
function Ae(e) {
  return $(e), e[0] instanceof Function ? { onDelete: e.shift() } : {};
}
function De(e) {
  return {
    ...Be(e),
    ...be(e),
    ...Se(e),
    ...ve(e),
    ...Ae(e)
  };
}
var B = class G {
  liteRtTensorBuffer;
  type;
  environment;
  deletedInternal = !1;
  onDelete;
  static copyFunctions = /* @__PURE__ */ new Map();
  constructor(t, r, n, o, s) {
    const {
      typedArray: i,
      gpuBuffer: a,
      liteRtTensorBuffer: l,
      shape: f,
      dataType: p,
      environment: u,
      onDelete: h
    } = De([t, r, n, o, s]);
    if (this.onDelete = h, this.environment = u ?? w().getDefaultEnvironment(), l) {
      if (f)
        throw new Error(
          "A LiteRtTensorBuffer cannot be provided with a shape."
        );
      if (p)
        throw new Error(
          "A LiteRtTensorBuffer cannot be provided with a data type."
        );
      this.liteRtTensorBuffer = l;
    } else if (a) {
      if (!f)
        throw new Error("A GPUBuffer must be provided with a shape.");
      if (!p)
        throw new Error("A GPUBuffer must be provided with a data type.");
      const [y, E] = Me(
        a,
        f,
        p,
        this.environment
      );
      this.liteRtTensorBuffer = y;
      const S = this.onDelete;
      this.onDelete = () => {
        w().liteRtWasm.wgpuBufferRelease(E), S?.();
      };
    } else if (i)
      this.liteRtTensorBuffer = Ue(i, f, u);
    else
      throw new Error("No data provided to create a Tensor.");
    this.type = _e(this.liteRtTensorBuffer);
  }
  static fromTypedArray(t, r, n) {
    return new G(t, r, n);
  }
  ensureNotDeleted() {
    if (this.deleted)
      throw new Error("Tensor is deleted and cannot be used.");
  }
  async data() {
    if (this.ensureNotDeleted(), this.liteRtTensorBuffer.bufferType().value === T.HOST_MEMORY)
      return this.toTypedArray();
    const t = await this.copyTo("wasm"), r = await t.data();
    return t.delete(), r;
  }
  toTypedArray() {
    this.ensureNotDeleted();
    const t = w().liteRtWasm;
    if (this.liteRtTensorBuffer.isWebGpuMemory())
      throw new Error(
        "Cannot convert a Tensor with WebGPU memory to a TypedArray."
      );
    if (this.liteRtTensorBuffer.bufferType().value !== t.LiteRtTensorBufferType.HOST_MEMORY.value)
      throw new Error(
        "Cannot convert a Tensor with non-host memory to a TypedArray."
      );
    if (this.liteRtTensorBuffer.size() !== this.liteRtTensorBuffer.packedSize() || this.liteRtTensorBuffer.offset() !== 0)
      throw new Error("Tensors with strides or padding are not yet supported.");
    const r = this.liteRtTensorBuffer.tensorType(), n = r.elementType(), o = t.liteRtGetByteWidth(n);
    r.delete();
    const s = D(n.value).typedArrayConstructor;
    if (s.BYTES_PER_ELEMENT !== o)
      throw new Error(
        `Byte width ${o} of the tensor's element type ${te[n.value]} does not match the expected byte width ${s.BYTES_PER_ELEMENT} of the ${s.name}.`
      );
    const i = this.liteRtTensorBuffer.lock(
      w().liteRtWasm.LiteRtTensorBufferLockMode.READ
    );
    try {
      const a = t.HEAPU8.slice(
        i,
        i + this.liteRtTensorBuffer.packedSize()
      );
      return new s(
        a.buffer,
        a.byteOffset,
        a.byteLength / o
      );
    } finally {
      this.liteRtTensorBuffer.unlock();
    }
  }
  getBufferType() {
    return this.ensureNotDeleted(), this.liteRtTensorBuffer.bufferType().value;
  }
  /**
   * Returns the underlying GPUBuffer of the Tensor.
   *
   * Note that the lifetime of the returned GPUBuffer is dependant upon how the
   * Tensor was created. If the Tensor was constructed from a GPUBuffer, then
   * the GPUBuffer will NOT be released when the Tensor is deleted. If the
   * Tensor was copied/moved to GPU from host memory, then the GPU buffer will
   * be released when the Tensor is deleted.
   *
   * The GPU buffer may be larger than the actual data in the tensor.
   *
   * @return The GPUBuffer containing the Tensor's data.
   */
  toGpuBuffer() {
    this.ensureNotDeleted();
    const t = w().liteRtWasm;
    if (!this.liteRtTensorBuffer.isWebGpuMemory())
      throw new Error(
        "Cannot convert a Tensor with non-WebGPU memory to a GPUBuffer."
      );
    const r = this.liteRtTensorBuffer.bufferType().value;
    if (r !== t.LiteRtTensorBufferType.WEB_GPU_BUFFER.value && r !== t.LiteRtTensorBufferType.WEB_GPU_BUFFER_FP16.value && r !== t.LiteRtTensorBufferType.WEB_GPU_BUFFER_PACKED.value)
      throw new Error(
        "Cannot convert a Tensor with host memory to a GPUBuffer."
      );
    if (this.liteRtTensorBuffer.size() !== this.liteRtTensorBuffer.packedSize() || this.liteRtTensorBuffer.offset() !== 0)
      throw new Error("Tensors with strides or padding are not yet supported.");
    const n = this.liteRtTensorBuffer.getWebGpuBuffer();
    return t.WebGPU.getJsObject(n);
  }
  getCopyFunctionSet(t) {
    this.ensureNotDeleted();
    const r = this.getBufferType(), n = G.copyFunctions.get(r);
    if (!n)
      throw new Error(`TensorBufferType ${v[r] ?? r} does not support copying or moving`);
    const o = typeof t == "string" ? we[t] : t;
    if (o == null)
      throw new Error(
        `Unknown destination '${t}' for copying or moving.`
      );
    const s = n.get(o);
    if (!s) {
      const i = [...n].map(([a]) => v[a] ?? a);
      throw new Error(`TensorBufferType ${v[r]} does not support copying or moving to ${v[o]}. It supports the following TensorBufferTypes: [${i.join(", ")}].`);
    }
    return [s, o];
  }
  /**
   * Copies the tensor to the given accelerator.
   *
   * @param destination The accelerator or buffer type to copy to.
   * @return A promise that resolves to the copied tensor.
   */
  async copyTo(t, r) {
    const [n, o] = this.getCopyFunctionSet(t);
    if (!n.copyTo)
      throw new Error(`Copying to ${v[o]} is not supported by this tensor.`);
    return n.copyTo(this, r);
  }
  /**
   * Moves the tensor to the given accelerator.
   *
   * @param destination The accelerator or buffer type to move to.
   * @return A promise that resolves to the moved tensor.
   */
  async moveTo(t, r) {
    const [n, o] = this.getCopyFunctionSet(t);
    if (!n.moveTo)
      throw new Error(`Moving to ${v[o]} is not supported by this tensor.`);
    return n.moveTo(this, r);
  }
  get bufferType() {
    return this.liteRtTensorBuffer.bufferType().value;
  }
  get accelerator() {
    const t = Re[this.bufferType];
    if (t === void 0)
      throw new Error(`TensorBufferType ${v[this.bufferType]} has an unknown accelerator type.`);
    return t;
  }
  get deleted() {
    return this.deletedInternal;
  }
  delete() {
    this.deletedInternal || (this.deletedInternal = !0, this.liteRtTensorBuffer.delete(), this.onDelete?.());
  }
};
function _e(e) {
  const t = e.tensorType(), r = t.elementType(), n = t.layout(), o = n.dimensions();
  return n.delete(), t.delete(), {
    dtype: D(r.value).dtype,
    layout: { dimensions: M(o) }
  };
}
function Me(e, t, r, n) {
  const s = w().liteRtWasm, i = new s.VectorInt32();
  se(t, i);
  const a = s.LiteRtLayout.create(i);
  i.delete();
  const l = s.LiteRtRankedTensorType.create(
    { value: D(r).elementType },
    a
  );
  a.delete();
  const f = s.WebGPU.importJsBuffer(e), p = s.LiteRtTensorBuffer.createFromWebGpuBuffer(
    n.liteRtEnvironment,
    l,
    s.LiteRtTensorBufferType.WEB_GPU_BUFFER_PACKED,
    f,
    e.size
  );
  return l.delete(), [p, f];
}
function Ue(e, t, r) {
  const n = w(), o = n.liteRtWasm;
  r = r ?? n.getDefaultEnvironment();
  const s = D(e).elementType, i = new o.VectorInt32();
  se(t ?? [e.length], i);
  const a = o.LiteRtLayout.create(i);
  i.delete();
  const l = a.numElements();
  if (e.length !== l)
    throw a.delete(), new Error(
      `Number of elements ${e.length} of the provided TypedArray does not match the expected number of elements ${l}.`
    );
  const f = o.LiteRtRankedTensorType.create({ value: s }, a);
  a.delete();
  const u = e.constructor.BYTES_PER_ELEMENT * e.length, h = f.bytes();
  if (u !== h)
    throw f.delete(), new Error(
      `Byte length ${u} of the provided TypedArray does not match the expected buffer size ${h}.`
    );
  const y = o.LiteRtTensorBuffer.createManaged(
    r.liteRtEnvironment,
    o.LiteRtTensorBufferType.HOST_MEMORY,
    f,
    u
  );
  f.delete();
  const E = y.lock(o.LiteRtTensorBufferLockMode.WRITE);
  try {
    const S = new Uint8Array(e.buffer, e.byteOffset, e.byteLength);
    o.HEAPU8.set(S, E);
  } finally {
    y.unlock();
  }
  return y;
}
var Pe = class {
  constructor(e, t, r, n) {
    this.signatureIndex = e, this.liteRtModel = t, this.liteRtCompiledModel = r, this.options = n, this.liteRtSimpleSignature = t.getSignature(e);
    const o = M(this.liteRtSimpleSignature.inputNames()), s = [];
    for (let l = 0; l < o.length; l++) {
      const f = o[l], p = t.getInputTensorType(e, l), u = r.getInputBufferRequirements(e, l);
      s.push(z(f, l, p, u));
    }
    this.inputDetails = Object.freeze(s);
    const i = M(this.liteRtSimpleSignature.outputNames()), a = [];
    for (let l = 0; l < i.length; l++) {
      const f = i[l], p = t.getOutputTensorType(e, l), u = r.getOutputBufferRequirements(e, l);
      a.push(z(f, l, p, u));
    }
    this.outputDetails = Object.freeze(a);
  }
  inputDetails;
  outputDetails;
  liteRtSimpleSignature;
  deletedInternal = !1;
  /**
   * The string key corresponding to this signature in the model.
   */
  get key() {
    return this.ensureNotDeleted(), this.liteRtSimpleSignature.key();
  }
  /**
   * Get details about each input tensor.
   */
  getInputDetails() {
    return this.ensureNotDeleted(), this.inputDetails;
  }
  /**
   * Get details about each output tensor.
   */
  getOutputDetails() {
    return this.ensureNotDeleted(), this.outputDetails;
  }
  async run(e) {
    this.ensureNotDeleted();
    const t = this.inputsToArray(e), { inputsOnAccelerator: r, cleanup: n } = await this.ensureInputsOnAccelerator(t);
    let o;
    try {
      o = this.runWithArray(r);
    } finally {
      n();
    }
    return Array.isArray(e) || e instanceof B ? o : this.outputsToRecord(o);
  }
  inputsToArray(e) {
    if (Array.isArray(e)) {
      if (e.length !== this.inputDetails.length)
        throw new Error(
          `run() called with ${e.length} inputs, but signature expects ${this.inputDetails.length} inputs`
        );
      return e;
    }
    if (e instanceof B) {
      if (this.inputDetails.length !== 1)
        throw new Error(
          `run() called with a single tensor, but signature expects ${this.inputDetails.length} inputs`
        );
      return [e];
    }
    const t = [];
    for (const r of this.inputDetails) {
      if (!(r.name in e))
        throw new Error(
          `run() called with input record that is missing input ${r.name} with index ${r.index}`
        );
      t.push(e[r.name]);
    }
    return t;
  }
  outputsToRecord(e) {
    const t = {};
    for (let r = 0; r < this.outputDetails.length; r++)
      t[this.outputDetails[r].name] = e[r];
    return t;
  }
  /**
   * Ensures that all input tensors are on the correct accelerator. Copies any
   * tensors that are not on the correct accelerator.
   *
   * @param inputs The input tensors to be passed to the signature. They must
   *     be in the same order and quantity as the input details.
   * @return A promise that resolves to a list of input tensors that are on the
   *     correct accelerator, and a cleanup function that deletes any tensors
   *     that were copied.
   */
  async ensureInputsOnAccelerator(e) {
    const t = [], r = [], n = this.getInputDetails();
    if (e.length !== n.length)
      throw new Error(`ensureInputsOnAccelerator() called with ${e.length} inputs, but signature expects ${n.length} inputs`);
    for (let o = 0; o < e.length; o++) {
      const s = e[o], i = s.getBufferType(), a = n[o].supportedBufferTypes;
      if (a.size === 0)
        throw new Error(`Tensor ${n[o].name} with index ${n[o].index} has no supported buffer types.`);
      if (a.has(i))
        r.push(s);
      else {
        const l = a.values().next().value, f = await s.copyTo(l);
        t.push(f), r.push(f);
      }
    }
    return {
      inputsOnAccelerator: r,
      cleanup: () => {
        for (const o of t)
          o.delete();
      }
    };
  }
  runWithArray(e) {
    for (let r = 0; r < e.length; r++) {
      const n = e[r], o = this.liteRtModel.getInputTensorType(this.signatureIndex, r), s = this.liteRtCompiledModel.getInputBufferRequirements(
        this.signatureIndex,
        r
      );
      w().liteRtWasm.checkTensorBufferCompatible(
        n.liteRtTensorBuffer,
        o,
        s
      ), o.delete(), s.delete();
    }
    return this.liteRtCompiledModel.run(
      this.signatureIndex,
      e.map((r) => r.liteRtTensorBuffer)
    ).map(
      (r) => new B(r, this.options.environment)
    );
  }
  get deleted() {
    return this.deletedInternal;
  }
  ensureNotDeleted() {
    if (this.deleted)
      throw new Error(
        "CompiledModelSignatureRunner is deleted and cannot be used."
      );
  }
  delete() {
    this.deletedInternal || (this.deletedInternal = !0, this.liteRtSimpleSignature.delete());
  }
};
function z(e, t, r, n) {
  const o = r.layout(), s = M(o.dimensions());
  o.delete();
  const i = new Set(M(n.supportedTypes()).map(({ value: l }) => l)), a = {
    name: e,
    index: t,
    dtype: D(r.elementType().value).dtype,
    shape: new Int32Array(s),
    supportedBufferTypes: i
  };
  return r.delete(), n.delete(), a;
}
var Le = class {
  constructor(e, t, r, n) {
    this.model = e, this.liteRtCompiledModel = t, this.options = r, this.onDelete = n;
    const o = e.liteRtModel.getNumSignatures(), s = {};
    for (let i = 0; i < o; i++) {
      const a = new Pe(
        i,
        e.liteRtModel,
        t,
        r
      );
      s[a.key] = a;
    }
    this.compiledModelSignatureRunners = Object.freeze(s), this.defaultSignature = Object.values(this.signatures)[0], this.key = this.defaultSignature.key;
  }
  defaultSignature;
  compiledModelSignatureRunners;
  key;
  deletedInternal = !1;
  get signatures() {
    return this.ensureNotDeleted(), this.compiledModelSignatureRunners;
  }
  getInputDetails() {
    return this.ensureNotDeleted(), this.defaultSignature.getInputDetails();
  }
  getOutputDetails() {
    return this.ensureNotDeleted(), this.defaultSignature.getOutputDetails();
  }
  async run(e, t) {
    this.ensureNotDeleted();
    const [r, n] = this.parseRunInputs(e, t);
    return await r.run(n);
  }
  parseRunInputs(e, t) {
    let r, n;
    if (typeof e == "string") {
      if (r = this.signatures[e], !r)
        throw new Error(
          `No signature named ${e} found in model.`
        );
      if (!t)
        throw new Error(
          `No input provided for signature ${e}`
        );
      n = t;
    } else
      r = this.defaultSignature, n = e;
    return [r, n];
  }
  get deleted() {
    return this.deletedInternal;
  }
  ensureNotDeleted() {
    if (this.deleted)
      throw new Error("CompiledModel is deleted and cannot be used.");
  }
  delete() {
    if (!this.deletedInternal) {
      this.deletedInternal = !0, this.liteRtCompiledModel.delete(), this.model.delete();
      for (const e of Object.values(
        this.compiledModelSignatureRunners
      ))
        e.delete();
      this.onDelete();
    }
  }
};
async function Fe(e) {
  const t = await fetch(e);
  return new Uint8Array(await t.arrayBuffer());
}
async function We(e) {
  let t = 0, r = new Uint8Array(
    1024
    /* arbitrary starting size */
  );
  const n = 2e9;
  for (; ; ) {
    const { done: o, value: s } = await e.read();
    if (s) {
      if (r.byteLength < t + s.byteLength) {
        if (t + s.byteLength > n)
          throw new Error(`Model is too large (> ${n} bytes).`);
        const i = new Uint8Array(Math.min(
          n,
          Math.max(r.byteLength, s.byteLength) * 2
        ));
        i.set(r), r = i;
      }
      r.set(s, t), t += s.byteLength;
    }
    if (o)
      break;
  }
  return r.slice(0, t);
}
var Ie = class {
  constructor(e, t) {
    this.liteRtModel = e, this.onDelete = t;
  }
  delete() {
    this.liteRtModel.delete(), this.onDelete();
  }
};
function H(e, t) {
  return w().loadAndCompile(e, t);
}
var ie = class {
  liteRtWasm;
  defaultEnvironment;
  objectsToDelete = /* @__PURE__ */ new Set();
  constructor(e) {
    this.liteRtWasm = e, this.liteRtWasm.setupLogging();
  }
  setDefaultEnvironment(e) {
    this.defaultEnvironment = e;
  }
  getDefaultEnvironment() {
    if (!this.defaultEnvironment)
      throw new Error("Default environment is not set.");
    return this.defaultEnvironment;
  }
  setWebGpuDevice(e) {
    const t = this.getDefaultEnvironment();
    this.setDefaultEnvironment(new I({
      ...t.options,
      webGpuDevice: e
    }));
  }
  getWebGpuDevice() {
    return this.getDefaultEnvironment().webGpuDevice;
  }
  /**
   * Loads and compiles a LiteRt model.
   *
   * @param model The model data. This can be a string (the model url), a URL
   *     object, a Uint8Array (the model bytes), or a
   *     ReadableStreamDefaultReader (for streaming model loading).
   * @param compileOptions The options for compiling the model. This includes
   *     the accelerator to use ('webgpu' or 'wasm') and the WebGPU device
   *     (for direct GPU model inputs / outputs).
   * @returns A promise that resolves to the CompiledModel.
   */
  async loadAndCompile(e, t = {}) {
    let r;
    if (typeof e == "string" || typeof URL < "u" && e instanceof URL)
      r = await Fe(e);
    else if (e instanceof Uint8Array)
      r = e;
    else if (e instanceof ReadableStreamDefaultReader)
      r = await We(e);
    else
      throw new Error("Unsupported model type.");
    const n = t.environment ?? this.getDefaultEnvironment(), o = t.accelerator ?? (n.webGpuDevice ? "webgpu" : "wasm");
    if (o === "webgpu" && !n.webGpuDevice)
      throw new Error(
        "WebGPU was requested but no WebGPU device is set in the environment."
      );
    const s = t.cpuOptions ?? { numThreads: this.liteRtWasm.getThreadCount() }, i = {
      environment: n,
      accelerator: o,
      cpuOptions: s
    }, a = this.liteRtWasm._malloc(r.byteLength);
    this.liteRtWasm.HEAPU8.set(r, a);
    const l = this.liteRtWasm.loadModel(
      i.environment.liteRtEnvironment,
      a,
      r.byteLength
    ), f = this.liteRtWasm.compileModel(
      i.environment.liteRtEnvironment,
      l,
      i
    ), p = new Ie(l, () => {
      this.liteRtWasm._free(a);
    }), u = new Le(
      p,
      f,
      i,
      () => {
        this.objectsToDelete.delete(u);
      }
    );
    return this.objectsToDelete.add(u), u;
  }
  delete() {
    for (const e of this.objectsToDelete)
      e.delete();
  }
};
function Oe(e, t) {
  if (!e) return t;
  if (!t) return e;
  const r = e.endsWith("/") ? e : e + "/", n = t.startsWith("/") ? t.substring(1) : t;
  return r + n;
}
var Ce = new Uint8Array([
  0,
  97,
  115,
  109,
  1,
  0,
  0,
  0,
  1,
  5,
  1,
  96,
  0,
  1,
  123,
  3,
  2,
  1,
  0,
  10,
  15,
  1,
  13,
  0,
  65,
  1,
  253,
  15,
  65,
  2,
  253,
  15,
  253,
  128,
  2,
  11
]), Ge = new Uint8Array([
  0,
  97,
  115,
  109,
  1,
  0,
  0,
  0,
  1,
  4,
  1,
  96,
  0,
  0,
  3,
  2,
  1,
  0,
  5,
  4,
  1,
  3,
  1,
  1,
  10,
  11,
  1,
  9,
  0,
  65,
  0,
  254,
  16,
  2,
  0,
  26,
  11
]), A = {
  relaxedSimd: void 0,
  threads: void 0
};
async function j(e) {
  try {
    return await WebAssembly.instantiate(e), { supported: !0 };
  } catch (t) {
    return { supported: !1, error: t };
  }
}
var ae = {
  relaxedSimd: () => (A.relaxedSimd === void 0 && (A.relaxedSimd = j(Ce)), A.relaxedSimd),
  threads: () => {
    if (A.threads === void 0)
      try {
        typeof MessageChannel < "u" && new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), A.threads = j(Ge);
      } catch (e) {
        A.threads = Promise.resolve({ supported: !1, error: e });
      }
    return A.threads;
  }
};
async function Ne(e) {
  const t = ae[e]?.();
  if (!t)
    throw new Error(`Unknown feature: ${e}`);
  return (await t).supported;
}
async function ke(e) {
  const t = ae[e]?.();
  if (!t)
    throw new Error(`Unknown feature: ${e}`);
  const r = await t;
  if (!r.supported)
    throw r.error;
}
var xe = "litert_wasm_internal.js", $e = "litert_wasm_compat_internal.js", ze = "litert_wasm_threaded_internal.js";
async function He(e, t) {
  const r = e, n = r.endsWith(".wasm") || r.endsWith(".js"), o = await Ne("relaxedSimd");
  if (t?.threads) {
    if (n && console.warn(
      `The \`threads\` option was specified, but the wasm path ${r} is a full file path. Whether threads are available or not will depend on the loaded file. To allow LiteRT.js to load the threaded wasm file, use a directory path instead of a full file path.`
    ), !o)
      throw new Error(
        "Threads are only supported with relaxed SIMD, and the current browser does not support relaxed SIMD."
      );
    await ke("threads");
  }
  let s = $e;
  o && (t?.threads ? s = ze : s = xe);
  let i = e;
  if (r.endsWith(".wasm"))
    throw new Error(
      "Please load the `.js` file corresponding to the `.wasm` file, or load the directory containing it."
    );
  return r.endsWith(".js") || (i = Oe(e, s)), me(ie, i);
}
function je(e, t) {
  if (ne())
    throw new Error("LiteRT is already loading / loaded.");
  return W(He(e, t).then(async (r) => (re(r), r.setDefaultEnvironment(
    await I.create()
  ), r)).catch((r) => {
    throw W(void 0), r;
  })), x();
}
function Ye(e) {
  const t = globalThis.TextDecoder ?? class {
    decode(o) {
      const s = o instanceof Uint8Array ? o : new Uint8Array(o);
      let i = "";
      for (const a of s)
        i += `%${a.toString(16).padStart(2, "0")}`;
      return decodeURIComponent(i);
    }
  }, r = new Function(
    "TextDecoder",
    `${e}
return typeof ModuleFactory === "function" ? ModuleFactory : undefined;`
  )(t);
  if (typeof r != "function")
    throw new Error("Failed to evaluate bundled LiteRT loader source.");
  return r;
}
function Ke(e, t, r) {
  if (ne())
    throw new Error("LiteRT is already loading / loaded.");
  if (r?.threads)
    throw new Error(
      "Threaded bundled LiteRT loading is not supported yet in the worklet fork."
    );
  return W((async () => {
    const o = await Ye(e)({
      wasmBinary: t,
      locateFile(i) {
        return i;
      }
    }), s = new ie(o);
    return re(s), s.setDefaultEnvironment(
      await I.create()
    ), s;
  })().catch((n) => {
    throw W(void 0), n;
  })), x();
}
async function Y(e, t = {}) {
  const r = t.environment ?? e.environment, n = w().liteRtWasm, o = e.liteRtTensorBuffer;
  if (o.bufferType().value !== T.HOST_MEMORY)
    throw new Error(
      "Source tensor is not in host memory. Cannot copy to host memory."
    );
  const i = o.lock(
    n.LiteRtTensorBufferLockMode.READ
  );
  let a;
  try {
    a = n.LiteRtTensorBuffer.createManaged(
      r.liteRtEnvironment,
      n.LiteRtTensorBufferType.HOST_MEMORY,
      o.tensorType(),
      o.size()
    );
    const l = a.lock(
      n.LiteRtTensorBufferLockMode.WRITE
    );
    try {
      const f = new Uint8Array(
        n.HEAPU8.buffer,
        i,
        o.size()
      );
      n.HEAPU8.set(f, l);
    } finally {
      a.unlock();
    }
  } finally {
    o.unlock();
  }
  if (!a)
    throw new Error("Failed to create destination tensor buffer.");
  return new B(a, r);
}
async function K(e, t = {}) {
  const r = t.environment ?? e.environment, n = r.webGpuDevice;
  if (!n)
    throw new Error(
      "No WebGPU device is available. Did you forget to pass a destination environment that has a WebGPU device?"
    );
  const o = w().liteRtWasm, i = e.liteRtTensorBuffer.size() + 3 & -4, a = n.createBuffer({
    size: i,
    usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: !0
  }), l = await a.getMappedRange(), f = new Uint8Array(l), p = e.liteRtTensorBuffer.lock(
    o.LiteRtTensorBufferLockMode.READ
  );
  try {
    const y = new Uint8Array(
      o.HEAPU8.buffer,
      p,
      e.liteRtTensorBuffer.size()
    );
    f.set(y);
  } finally {
    e.liteRtTensorBuffer.unlock();
  }
  a.unmap();
  const u = n.createBuffer({
    size: i,
    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
  }), h = n.createCommandEncoder();
  return h.copyBufferToBuffer(
    a,
    0,
    u,
    0,
    i
  ), n.queue.submit([h.finish()]), a.destroy(), new B(
    u,
    e.type.layout.dimensions,
    e.type.dtype,
    r,
    () => {
      u.destroy();
    }
  );
}
async function V(e, t = {}) {
  const r = t.environment ?? e.environment, n = e.environment.webGpuDevice;
  if (!n)
    throw new Error(
      "No WebGPU device is available. Does the source tensor have a WebGPU device?"
    );
  const o = w().liteRtWasm, s = e.liteRtTensorBuffer, i = s.bufferType();
  if (i !== o.LiteRtTensorBufferType.WEB_GPU_BUFFER_PACKED)
    throw new Error(`Cannot convert a tensor with a non-WebGPU buffer type ${i} to a CPU tensor.`);
  const a = o.WebGPU.getJsObject(
    s.getWebGpuBuffer()
  ), l = s.offset(), f = s.tensorType(), p = f.layout(), u = p.numElements(), h = D(f.elementType().value).typedArrayConstructor;
  p.delete(), f.delete();
  let y = a, E = () => {
  };
  if (!(a.usage & GPUBufferUsage.MAP_READ)) {
    y = n.createBuffer({
      size: a.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    }), E = () => {
      y.destroy();
    };
    const U = n.createCommandEncoder();
    U.copyBufferToBuffer(
      a,
      0,
      y,
      0,
      a.size
    ), n.queue.submit([U.finish()]);
  }
  await y.mapAsync(GPUMapMode.READ);
  const S = y.getMappedRange(), m = new h(S, l, u), _ = new B(m, e.type.layout.dimensions, r);
  return y.unmap(), E(), _;
}
function O(e) {
  return async (t, r) => {
    const n = await e(t, r);
    return t.delete(), n;
  };
}
function Ve() {
  B.copyFunctions.set(T.HOST_MEMORY, /* @__PURE__ */ new Map([
    [
      T.HOST_MEMORY,
      {
        copyTo: Y,
        // There might be a more efficient way to move
        // from CPU to CPU.
        moveTo: O(Y)
      }
    ],
    [
      T.WEB_GPU_BUFFER_PACKED,
      {
        copyTo: K,
        moveTo: O(K)
      }
    ]
  ])), B.copyFunctions.set(T.WEB_GPU_BUFFER_PACKED, /* @__PURE__ */ new Map([
    [
      T.HOST_MEMORY,
      {
        copyTo: V,
        moveTo: O(V)
      }
    ]
  ]));
}
Ve();
const g = 512, b = 128, P = g / 2 + 1, N = [
  "fft",
  "magnitude",
  "model1_tensor",
  "model1_invoke",
  "model1_read",
  "mask",
  "ifft",
  "model2_tensor",
  "model2_invoke",
  "model2_read",
  "overlap_add",
  "infer_total",
  "denoise_total"
], qe = {
  sampleRate: 16e3,
  channels: 1,
  frameSize: g,
  frameDuration: 32
};
function Xe(e) {
  return Number.isFinite(e) && e !== void 0 && e > 0 ? Math.floor(e) : 1;
}
async function Je(e) {
  const t = x();
  return t || (e.loaderSource && e.wasmBinary ? Ke(e.loaderSource, e.wasmBinary, {
    threads: e.threads
  }) : je(e.wasmRoot, { threads: e.threads }));
}
function Ze(e) {
  return Array.from(e, (t) => Number(t));
}
function q(e) {
  return e.map((t) => ({
    name: t.name,
    index: t.index,
    dtype: t.dtype,
    shape: Ze(t.shape)
  }));
}
function X(e) {
  return {
    inputs: q(e.getInputDetails()),
    outputs: q(e.getOutputDetails())
  };
}
function J(e, t) {
  const r = e.defaultSignature;
  if (!r || typeof r.runWithArray != "function")
    throw new Error(
      `LiteRT.js internal sync runner is unavailable for ${t}. This package currently depends on that API to keep dtln_denoise synchronous.`
    );
  return r;
}
function Z(e, t) {
  if (!(t instanceof Float32Array))
    throw new TypeError(`${e} must be a Float32Array`);
}
function L(e) {
  for (const t of e)
    t.delete();
}
function c() {
  return performance.now();
}
function Q() {
  return {
    inferCalls: 0,
    denoiseCalls: 0,
    timings: Object.fromEntries(
      N.map((t) => [t, []])
    )
  };
}
function R(e, t, r) {
  e.timings[t].push(r);
}
function Qe(e) {
  if (e.length === 0)
    return {
      count: 0,
      totalMs: 0,
      meanMs: 0,
      p95Ms: 0
    };
  const t = [...e].sort((o, s) => o - s), r = e.reduce((o, s) => o + s, 0), n = Math.min(
    t.length - 1,
    Math.max(0, Math.ceil(t.length * 0.95) - 1)
  );
  return {
    count: e.length,
    totalMs: r,
    meanMs: r / e.length,
    p95Ms: t[n] ?? 0
  };
}
function et(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const o of N)
    t[o] = {
      ...Qe(e.timings[o]),
      inferShare: 0,
      denoiseShare: 0
    };
  const r = t.infer_total.totalMs, n = t.denoise_total.totalMs;
  for (const o of N) {
    const s = t[o].totalMs;
    t[o].inferShare = r > 0 ? s / r : 0, t[o].denoiseShare = n > 0 ? s / n : 0;
  }
  return {
    inferCalls: e.inferCalls,
    denoiseCalls: e.denoiseCalls,
    stages: t
  };
}
function F(e, t) {
  if (!(t instanceof Float32Array))
    throw new TypeError(`${e} must resolve to Float32Array`);
  return t;
}
function ee(e) {
  return e.createComplexArray();
}
class tt {
  model1Runner;
  model2Runner;
  profilingEnabled;
  profile;
  model1InputShapes;
  model2InputShapes;
  fft;
  fftSpectrum;
  ifftComplex;
  inBuffer;
  outBuffer;
  states1;
  states2;
  inMag;
  estimatedBlock;
  constructor(t, r, n = {}) {
    if (this.model1Runner = J(t, "model1"), this.model2Runner = J(r, "model2"), this.profilingEnabled = n.profilingEnabled === !0, this.profile = Q(), this.model1InputShapes = t.getInputDetails().map((o) => o.shape), this.model2InputShapes = r.getInputDetails().map((o) => o.shape), this.model1InputShapes.length !== 2 || this.model2InputShapes.length !== 2)
      throw new Error("Expected exactly two inputs for each DTLN model");
    this.fft = new le(g), this.fftSpectrum = ee(this.fft), this.ifftComplex = ee(this.fft), this.inBuffer = new Float32Array(g), this.outBuffer = new Float32Array(g), this.states1 = new Float32Array(g), this.states2 = new Float32Array(g), this.inMag = new Float32Array(P), this.estimatedBlock = new Float32Array(g);
  }
  denoise(t, r) {
    if (Z("inputSamples", t), Z("outputSamples", r), t.length % b !== 0)
      throw new RangeError(
        `inputSamples length must be a multiple of ${b}`
      );
    if (r.length < t.length)
      throw new RangeError("outputSamples must be at least as large as inputSamples");
    const n = this.profilingEnabled ? c() : 0, o = t.length / b;
    for (let s = 0; s < o; s++) {
      const i = s * b;
      this.inBuffer.copyWithin(0, b), this.inBuffer.set(
        t.subarray(i, i + b),
        g - b
      ), this.infer(), r.set(this.outBuffer.subarray(0, b), i);
    }
    return this.profilingEnabled && (this.profile.denoiseCalls++, R(this.profile, "denoise_total", c() - n)), !1;
  }
  getProfile() {
    return et(this.profile);
  }
  resetProfile() {
    this.profile = Q();
  }
  infer() {
    const t = this.profilingEnabled ? c() : 0;
    let r = this.profilingEnabled ? t : 0;
    this.fft.realTransform(this.fftSpectrum, this.inBuffer), this.profilingEnabled && (R(this.profile, "fft", c() - r), r = c());
    for (let u = 0; u < P; u++) {
      const h = u * 2;
      this.inMag[u] = Math.hypot(this.fftSpectrum[h], this.fftSpectrum[h + 1]);
    }
    this.profilingEnabled && (R(this.profile, "magnitude", c() - r), r = c());
    const n = [
      B.fromTypedArray(this.inMag, this.model1InputShapes[0]),
      B.fromTypedArray(this.states1, this.model1InputShapes[1])
    ];
    this.profilingEnabled && (R(this.profile, "model1_tensor", c() - r), r = c());
    let o;
    try {
      o = this.model1Runner.runWithArray(n);
    } finally {
      L(n);
    }
    this.profilingEnabled && (R(this.profile, "model1_invoke", c() - r), r = c());
    const s = F("model1 mask output", o[0].toTypedArray()), i = F(
      "model1 state output",
      o[1].toTypedArray()
    );
    this.states1.set(i), this.profilingEnabled && (R(this.profile, "model1_read", c() - r), r = c());
    for (let u = 0; u < P; u++) {
      const h = u * 2, y = s[u];
      this.fftSpectrum[h] *= y, this.fftSpectrum[h + 1] *= y;
    }
    this.profilingEnabled && (R(this.profile, "mask", c() - r), r = c()), L(o), this.fftSpectrum[1] = 0, this.fftSpectrum[(P - 1) * 2 + 1] = 0, this.fft.completeSpectrum(this.fftSpectrum), this.fft.inverseTransform(this.ifftComplex, this.fftSpectrum);
    for (let u = 0; u < g; u++)
      this.estimatedBlock[u] = this.ifftComplex[u * 2];
    this.profilingEnabled && (R(this.profile, "ifft", c() - r), r = c());
    const a = [
      B.fromTypedArray(this.estimatedBlock, this.model2InputShapes[0]),
      B.fromTypedArray(this.states2, this.model2InputShapes[1])
    ];
    this.profilingEnabled && (R(this.profile, "model2_tensor", c() - r), r = c());
    let l;
    try {
      l = this.model2Runner.runWithArray(a);
    } finally {
      L(a);
    }
    this.profilingEnabled && (R(this.profile, "model2_invoke", c() - r), r = c());
    const f = F("model2 output", l[0].toTypedArray()), p = F(
      "model2 state output",
      l[1].toTypedArray()
    );
    this.states2.set(p), L(l), this.profilingEnabled && (R(this.profile, "model2_read", c() - r), r = c()), this.outBuffer.copyWithin(0, b), this.outBuffer.fill(0, g - b);
    for (let u = 0; u < g; u++) {
      const h = this.outBuffer[u] ?? 0;
      this.outBuffer[u] = h + f[u];
    }
    this.profilingEnabled && (R(this.profile, "overlap_add", c() - r), this.profile.inferCalls++, R(this.profile, "infer_total", c() - t));
  }
}
async function rt(e) {
  const t = e.liteRtWasmRoot, r = e.model1Data ?? e.model1Url, n = e.model2Data ?? e.model2Url, o = e.threads === !0, s = Xe(e.numThreads), i = e.enableProfiling === !0;
  if (!r)
    throw new Error("Missing model1 source. Provide model1Url or model1Data.");
  if (!n)
    throw new Error("Missing model2 source. Provide model2Url or model2Data.");
  if (!e.liteRtLoaderSource && !t)
    throw new Error(
      "Missing LiteRT runtime source. Provide liteRtWasmRoot or bundled loader assets."
    );
  const a = {
    wasmRoot: t,
    threads: o
  };
  e.liteRtLoaderSource !== void 0 && (a.loaderSource = e.liteRtLoaderSource), e.liteRtWasmBinary !== void 0 && (a.wasmBinary = e.liteRtWasmBinary), await Je(a);
  const l = {
    accelerator: "wasm",
    cpuOptions: {
      numThreads: s
    }
  }, [f, p] = await Promise.all([
    H(r, l),
    H(n, l)
  ]), u = {
    model1: X(f),
    model2: X(p),
    threads: o,
    numThreads: s,
    liteRtWasmRoot: t
  };
  e.logModelDetails && console.info("[noise-suppression] model details", u);
  const h = /* @__PURE__ */ new Map();
  let y = 1;
  const E = (m) => {
    const _ = h.get(m);
    if (!_)
      throw new Error(`Unknown noise suppression handle: ${m}`);
    return _;
  }, S = {
    ready: Promise.resolve(void 0),
    modelDetails: u,
    audioConfig: qe,
    dtln_create() {
      const m = y++;
      return h.set(m, new tt(f, p, { profilingEnabled: i })), m;
    },
    dtln_denoise(m, _, U) {
      return E(m).denoise(_, U);
    },
    dtln_stop(m) {
      h.delete(m);
    },
    dtln_destroy(m) {
      h.delete(m);
    },
    get_profile(m) {
      return E(m).getProfile();
    },
    reset_profile(m) {
      E(m).resetProfile();
    },
    dtln_profile_get(m) {
      return E(m).getProfile();
    },
    dtln_profile_reset(m) {
      E(m).resetProfile();
    }
  };
  return S.ready = Promise.resolve(S), S;
}
async function it(e = {}) {
  const t = {
    liteRtWasmRoot: e.liteRtWasmRoot ?? pe(),
    model1Url: e.model1Url ?? de(),
    model2Url: e.model2Url ?? ce(),
    threads: fe(e.threads),
    numThreads: ue(e.numThreads)
  };
  return e.logModelDetails !== void 0 && (t.logModelDetails = e.logModelDetails), e.enableProfiling !== void 0 && (t.enableProfiling = e.enableProfiling), rt(t);
}
export {
  qe as AUDIO_CONFIG,
  it as createNoiseSuppressionModule,
  rt as createNoiseSuppressionRuntime,
  it as default
};
//# sourceMappingURL=index.js.map
