import ce from "fft.js";
import { r as pe, a as he, b as me, c as ye, d as Te } from "./browser-runtime-options-szKHyy8v.js";
async function $(e) {
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
var L = async (e, t, r, n, o) => {
  let s = t, a;
  if (typeof t == "object" && t !== null && (s = t.wasmLoaderScript, r = t.assetLoaderScript, n = t.glCanvas, o = t.fileLocator, a = t.moduleFactory), a) {
    const l = await a(o);
    return new e(l, n);
  }
  if (s && await $(s), !self.ModuleFactory)
    throw new Error("ModuleFactory not set.");
  if (r && (await $(r), !self.ModuleFactory))
    throw new Error("ModuleFactory not set.");
  if (self.Module && o) {
    const l = self.Module;
    l.locateFile = o.locateFile, o.mainScriptUrlOrBlob && (l.mainScriptUrlOrBlob = o.mainScriptUrlOrBlob);
  }
  const i = await self.ModuleFactory(self.Module || o);
  return self.ModuleFactory = self.Module = void 0, new e(i, n);
}, p = {
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
}, ae = {
  [p.NONE]: "NONE",
  [p.FLOAT32]: "FLOAT32",
  [p.INT32]: "INT32",
  [p.UINT8]: "UINT8",
  [p.INT64]: "INT64",
  [p.STRING]: "STRING",
  [p.BOOL]: "BOOL",
  [p.INT16]: "INT16",
  [p.COMPLEX64]: "COMPLEX64",
  [p.INT8]: "INT8",
  [p.FLOAT16]: "FLOAT16",
  [p.FLOAT64]: "FLOAT64",
  [p.COMPLEX128]: "COMPLEX128",
  [p.UINT64]: "UINT64",
  [p.RESOURCE]: "RESOURCE",
  [p.VARIANT]: "VARIANT",
  [p.UINT32]: "UINT32",
  [p.UINT16]: "UINT16",
  [p.INT4]: "INT4",
  [p.BFLOAT16]: "BFLOAT16"
}, T = {
  HOST_MEMORY: 1,
  WEB_GPU_BUFFER: 20,
  WEB_GPU_BUFFER_FP16: 21,
  WEB_GPU_BUFFER_PACKED: 26
}, _ = {
  [T.HOST_MEMORY]: "HOST_MEMORY",
  [T.WEB_GPU_BUFFER]: "WEB_GPU_BUFFER",
  [T.WEB_GPU_BUFFER_FP16]: "WEB_GPU_BUFFER_FP16",
  [T.WEB_GPU_BUFFER_PACKED]: "WEB_GPU_BUFFER_PACKED"
}, we = Object.freeze([
  {
    dtype: "float32",
    typedArrayConstructor: Float32Array,
    elementType: p.FLOAT32
  },
  {
    dtype: "int32",
    typedArrayConstructor: Int32Array,
    elementType: p.INT32
  },
  {
    dtype: "uint8",
    typedArrayConstructor: Uint8Array,
    elementType: p.UINT8
  }
]);
function M(e) {
  for (const t of we)
    if (t.dtype === e || t.typedArrayConstructor === e || e instanceof t.typedArrayConstructor || t.elementType === e)
      return t;
  throw typeof e == "string" ? new Error(`DType ${e} is not supported.`) : e instanceof Object ? new Error(`Typed array ${"name" in e ? e.name : e.constructor.name} is not supported.`) : new Error(
    `Element type ${ae[e] ?? e} is not supported.`
  );
}
var Re = class extends Error {
  constructor() {
    super(
      "LiteRT is not initialized yet. Please call loadLiteRt() and wait for its promise to resolve to load the LiteRT WASM module."
    );
  }
}, N = void 0, k = void 0;
function w() {
  if (!N)
    throw new Re();
  return N;
}
function Ee(e) {
  N = e;
}
function le() {
  return k;
}
function ge() {
  return !!k;
}
function z(e) {
  k = e;
}
var Be = {
  webgpu: T.WEB_GPU_BUFFER_PACKED,
  wasm: T.HOST_MEMORY
}, be = {
  [T.HOST_MEMORY]: "wasm",
  [T.WEB_GPU_BUFFER]: "webgpu",
  [T.WEB_GPU_BUFFER_FP16]: "webgpu",
  [T.WEB_GPU_BUFFER_PACKED]: "webgpu"
}, ve = [
  "shader-f16",
  "subgroups"
], x = class ue {
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
        r = await Se();
      } catch (n) {
        console.warn("Failed to create default WebGPU device:", n);
      }
    return new ue({
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
async function Se() {
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
  for (const o of ve)
    t.features.has(o) && n.push(o);
  return await t.requestDevice({
    requiredFeatures: n,
    requiredLimits: r
  });
}
function D(e) {
  const t = new Array(e.size());
  for (let r = 0; r < e.size(); ++r)
    t[r] = e.get(r);
  return e.delete(), t;
}
function fe(e, t) {
  for (const r of e)
    t.push_back(r);
}
function _e(e) {
  const t = e.shift(), r = w().liteRtWasm;
  if (t instanceof r.LiteRtTensorBuffer)
    return { liteRtTensorBuffer: t };
  if (ArrayBuffer.isView(t))
    return { typedArray: t };
  if (t instanceof GPUBuffer)
    return { gpuBuffer: t };
  throw new Error(
    `Unknown type (${t?.constructor.name ?? t}) provided to create a Tensor`
  );
}
function Me(e) {
  return Array.isArray(e[0]) || e[0] instanceof Int32Array ? { shape: e.shift() } : {};
}
function j(e) {
  for (; e.length > 0 && e[0] === void 0; )
    e.shift();
}
function Ae(e) {
  if (j(e), typeof e[0] == "string") {
    const t = e.shift();
    return { dataType: M(t).dtype };
  } else
    return {};
}
function De(e) {
  return j(e), e[0] instanceof x ? { environment: e.shift() } : {};
}
function Ue(e) {
  return j(e), e[0] instanceof Function ? { onDelete: e.shift() } : {};
}
function Pe(e) {
  return {
    ..._e(e),
    ...Me(e),
    ...Ae(e),
    ...De(e),
    ...Ue(e)
  };
}
var g = class O {
  liteRtTensorBuffer;
  type;
  environment;
  deletedInternal = !1;
  onDelete;
  static copyFunctions = /* @__PURE__ */ new Map();
  constructor(t, r, n, o, s) {
    const {
      typedArray: a,
      gpuBuffer: i,
      liteRtTensorBuffer: l,
      shape: f,
      dataType: h,
      environment: u,
      onDelete: d
    } = Pe([t, r, n, o, s]);
    if (this.onDelete = d, this.environment = u ?? w().getDefaultEnvironment(), l) {
      if (f)
        throw new Error(
          "A LiteRtTensorBuffer cannot be provided with a shape."
        );
      if (h)
        throw new Error(
          "A LiteRtTensorBuffer cannot be provided with a data type."
        );
      this.liteRtTensorBuffer = l;
    } else if (i) {
      if (!f)
        throw new Error("A GPUBuffer must be provided with a shape.");
      if (!h)
        throw new Error("A GPUBuffer must be provided with a data type.");
      const [y, B] = We(
        i,
        f,
        h,
        this.environment
      );
      this.liteRtTensorBuffer = y;
      const S = this.onDelete;
      this.onDelete = () => {
        w().liteRtWasm.wgpuBufferRelease(B), S?.();
      };
    } else if (a)
      this.liteRtTensorBuffer = Le(
        a,
        f,
        u
      );
    else
      throw new Error("No data provided to create a Tensor.");
    this.type = Fe(this.liteRtTensorBuffer);
  }
  static fromTypedArray(t, r, n) {
    return new O(t, r, n);
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
    const s = M(
      n.value
    ).typedArrayConstructor;
    if (s.BYTES_PER_ELEMENT !== o)
      throw new Error(
        `Byte width ${o} of the tensor's element type ${ae[n.value]} does not match the expected byte width ${s.BYTES_PER_ELEMENT} of the ${s.name}.`
      );
    const a = this.liteRtTensorBuffer.lock(
      w().liteRtWasm.LiteRtTensorBufferLockMode.READ
    );
    try {
      const i = t.HEAPU8.slice(
        a,
        a + this.liteRtTensorBuffer.packedSize()
      );
      return new s(
        i.buffer,
        i.byteOffset,
        i.byteLength / o
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
    const r = this.getBufferType(), n = O.copyFunctions.get(r);
    if (!n)
      throw new Error(
        `TensorBufferType ${_[r] ?? r} does not support copying or moving`
      );
    const o = typeof t == "string" ? Be[t] : t;
    if (o == null)
      throw new Error(
        `Unknown destination '${t}' for copying or moving.`
      );
    const s = n.get(o);
    if (!s) {
      const a = [...n].map(
        ([i]) => _[i] ?? i
      );
      throw new Error(
        `TensorBufferType ${_[r]} does not support copying or moving to ${_[o]}. It supports the following TensorBufferTypes: [${a.join(
          ", "
        )}].`
      );
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
      throw new Error(
        `Copying to ${_[o]} is not supported by this tensor.`
      );
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
      throw new Error(
        `Moving to ${_[o]} is not supported by this tensor.`
      );
    return n.moveTo(this, r);
  }
  get bufferType() {
    return this.liteRtTensorBuffer.bufferType().value;
  }
  get accelerator() {
    const t = be[this.bufferType];
    if (t === void 0)
      throw new Error(
        `TensorBufferType ${_[this.bufferType]} has an unknown accelerator type.`
      );
    return t;
  }
  get deleted() {
    return this.deletedInternal;
  }
  delete() {
    this.deletedInternal || (this.deletedInternal = !0, this.liteRtTensorBuffer.delete(), this.onDelete?.());
  }
};
function Fe(e) {
  const t = e.tensorType(), r = t.elementType(), n = t.layout(), o = n.dimensions();
  return n.delete(), t.delete(), {
    dtype: M(r.value).dtype,
    layout: { dimensions: D(o) }
  };
}
function We(e, t, r, n) {
  const s = w().liteRtWasm, a = new s.VectorInt32();
  fe(t, a);
  const i = s.LiteRtLayout.create(a);
  a.delete();
  const l = s.LiteRtRankedTensorType.create(
    { value: M(r).elementType },
    i
  );
  i.delete();
  const f = s.WebGPU.importJsBuffer(e), h = s.LiteRtTensorBuffer.createFromWebGpuBuffer(
    n.liteRtEnvironment,
    l,
    s.LiteRtTensorBufferType.WEB_GPU_BUFFER_PACKED,
    f,
    e.size
  );
  return l.delete(), [h, f];
}
function Le(e, t, r) {
  const n = w(), o = n.liteRtWasm;
  r = r ?? n.getDefaultEnvironment();
  const s = M(e).elementType, a = new o.VectorInt32();
  fe(t ?? [e.length], a);
  const i = o.LiteRtLayout.create(a);
  a.delete();
  const l = i.numElements();
  if (e.length !== l)
    throw i.delete(), new Error(
      `Number of elements ${e.length} of the provided TypedArray does not match the expected number of elements ${l}.`
    );
  const f = o.LiteRtRankedTensorType.create(
    { value: s },
    i
  );
  i.delete();
  const u = e.constructor.BYTES_PER_ELEMENT * e.length, d = f.bytes();
  if (u !== d)
    throw f.delete(), new Error(
      `Byte length ${u} of the provided TypedArray does not match the expected buffer size ${d}.`
    );
  const y = o.LiteRtTensorBuffer.createManaged(
    r.liteRtEnvironment,
    o.LiteRtTensorBufferType.HOST_MEMORY,
    f,
    u
  );
  f.delete();
  const B = y.lock(
    o.LiteRtTensorBufferLockMode.WRITE
  );
  try {
    const S = new Uint8Array(
      e.buffer,
      e.byteOffset,
      e.byteLength
    );
    o.HEAPU8.set(S, B);
  } finally {
    y.unlock();
  }
  return y;
}
var Ie = class {
  constructor(e, t, r, n) {
    this.signatureIndex = e, this.liteRtModel = t, this.liteRtCompiledModel = r, this.options = n, this.liteRtSimpleSignature = t.getSignature(e);
    const o = D(this.liteRtSimpleSignature.inputNames()), s = [];
    for (let l = 0; l < o.length; l++) {
      const f = o[l], h = t.getInputTensorType(e, l), u = r.getInputBufferRequirements(e, l);
      s.push(H(f, l, h, u));
    }
    this.inputDetails = Object.freeze(s);
    const a = D(this.liteRtSimpleSignature.outputNames()), i = [];
    for (let l = 0; l < a.length; l++) {
      const f = a[l], h = t.getOutputTensorType(e, l), u = r.getOutputBufferRequirements(e, l);
      i.push(H(f, l, h, u));
    }
    this.outputDetails = Object.freeze(i);
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
      o = await this.runWithArray(r);
    } finally {
      n();
    }
    return Array.isArray(e) || e instanceof g ? o : this.outputsToRecord(o);
  }
  inputsToArray(e) {
    if (Array.isArray(e)) {
      if (e.length !== this.inputDetails.length)
        throw new Error(
          `run() called with ${e.length} inputs, but signature expects ${this.inputDetails.length} inputs`
        );
      return e;
    }
    if (e instanceof g) {
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
      const s = e[o], a = s.getBufferType(), i = n[o].supportedBufferTypes;
      if (i.size === 0)
        throw new Error(`Tensor ${n[o].name} with index ${n[o].index} has no supported buffer types.`);
      if (i.has(a))
        r.push(s);
      else {
        const l = i.values().next().value, f = await s.copyTo(l);
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
  async runWithArray(e) {
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
    return (await this.liteRtCompiledModel.run(
      this.signatureIndex,
      e.map((r) => r.liteRtTensorBuffer)
    )).map(
      (r) => new g(r, this.options.environment)
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
function H(e, t, r, n) {
  const o = r.layout(), s = D(o.dimensions());
  o.delete();
  const a = new Set(D(n.supportedTypes()).map(({ value: l }) => l)), i = {
    name: e,
    index: t,
    dtype: M(r.elementType().value).dtype,
    shape: new Int32Array(s),
    supportedBufferTypes: a
  };
  return r.delete(), n.delete(), i;
}
var Ce = class {
  constructor(e, t, r, n) {
    this.model = e, this.liteRtCompiledModel = t, this.options = r, this.onDelete = n;
    const o = e.liteRtModel.getNumSignatures(), s = {};
    for (let a = 0; a < o; a++) {
      const i = new Ie(
        a,
        e.liteRtModel,
        t,
        r
      );
      s[i.key] = i;
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
  get isFullyAccelerated() {
    return this.ensureNotDeleted(), this.liteRtCompiledModel.isFullyAccelerated();
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
async function Ne(e) {
  const t = await fetch(e);
  return new Uint8Array(await t.arrayBuffer());
}
async function Oe(e) {
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
        const a = new Uint8Array(Math.min(
          n,
          Math.max(r.byteLength, s.byteLength) * 2
        ));
        a.set(r), r = a;
      }
      r.set(s, t), t += s.byteLength;
    }
    if (o)
      break;
  }
  return r.slice(0, t);
}
var Ge = class {
  constructor(e, t) {
    this.liteRtModel = e, this.onDelete = t;
  }
  delete() {
    this.liteRtModel.delete(), this.onDelete();
  }
};
function Y(e, t) {
  return w().loadAndCompile(e, t);
}
var I = class {
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
    this.setDefaultEnvironment(new x({
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
    if (typeof e == "string" || e instanceof URL)
      r = await Ne(e);
    else if (e instanceof Uint8Array)
      r = e;
    else if (e instanceof ReadableStreamDefaultReader)
      r = await Oe(e);
    else
      throw new Error("Unsupported model type.");
    const n = t.environment ?? this.getDefaultEnvironment(), o = t.accelerator ?? (n.webGpuDevice ? "webgpu" : "wasm");
    if ((Array.isArray(o) ? o.includes("webgpu") : o === "webgpu") && !n.webGpuDevice)
      throw new Error(
        "WebGPU was requested but no WebGPU device is set in the environment."
      );
    const a = t.cpuOptions ?? { numThreads: this.liteRtWasm.getThreadCount() }, i = {
      environment: n,
      accelerator: o,
      cpuOptions: a,
      gpuOptions: t.gpuOptions ?? {},
      webNNOptions: t.webNNOptions ?? {}
    }, l = this.liteRtWasm._malloc(r.byteLength);
    this.liteRtWasm.HEAPU8.set(r, l);
    const f = this.liteRtWasm.loadModel(
      i.environment.liteRtEnvironment,
      l,
      r.byteLength
    ), h = await this.liteRtWasm.compileModel(
      i.environment.liteRtEnvironment,
      f,
      i
    ), u = new Ge(f, () => {
      this.liteRtWasm._free(l);
    }), d = new Ce(
      u,
      h,
      i,
      () => {
        this.objectsToDelete.delete(d);
      }
    );
    return this.objectsToDelete.add(d), d;
  }
  delete() {
    for (const e of this.objectsToDelete)
      e.delete();
  }
};
function ke(e, t) {
  if (!e) return t;
  if (!t) return e;
  const r = e.endsWith("/") ? e : e + "/", n = t.startsWith("/") ? t.substring(1) : t;
  return r + n;
}
var xe = new Uint8Array([
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
]), je = new Uint8Array([
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
]), R = {
  relaxedSimd: void 0,
  threads: void 0,
  jspi: void 0,
  webnn: void 0
};
function $e() {
  return "Suspending" in WebAssembly;
}
function ze() {
  return typeof navigator < "u" && !!navigator.ml;
}
async function J(e) {
  try {
    return await WebAssembly.instantiate(e), { supported: !0 };
  } catch (t) {
    return { supported: !1, error: t };
  }
}
var de = {
  relaxedSimd: () => (R.relaxedSimd === void 0 && (R.relaxedSimd = J(xe)), R.relaxedSimd),
  threads: () => {
    if (R.threads === void 0)
      try {
        typeof MessageChannel < "u" && new MessageChannel().port1.postMessage(new SharedArrayBuffer(1)), R.threads = J(je);
      } catch (e) {
        R.threads = Promise.resolve({ supported: !1, error: e });
      }
    return R.threads;
  },
  jspi: () => {
    if (R.jspi === void 0) {
      const e = $e();
      R.jspi = Promise.resolve({
        supported: e,
        error: e ? void 0 : new Error("JSPI is not supported")
      });
    }
    return R.jspi;
  },
  webnn: () => {
    if (R.webnn === void 0) {
      const e = ze();
      R.webnn = Promise.resolve({
        supported: e,
        error: e ? void 0 : new Error("WebNN is not supported")
      });
    }
    return R.webnn;
  }
};
async function He(e) {
  const t = de[e]?.();
  if (!t)
    throw new Error(`Unknown feature: ${e}`);
  return (await t).supported;
}
async function K(e) {
  const t = de[e]?.();
  if (!t)
    throw new Error(`Unknown feature: ${e}`);
  const r = await t;
  if (!r.supported)
    throw r.error;
}
var Ye = "litert_wasm_internal.js", Je = "litert_wasm_compat_internal.js", Ke = "litert_wasm_threaded_internal.js", Ve = "litert_wasm_jspi_internal.js", qe = "litert_wasm_internal.mjs", Xe = "litert_wasm_compat_internal.mjs", Ze = "litert_wasm_threaded_internal.mjs", Qe = "litert_wasm_jspi_internal.mjs";
async function et(e, t) {
  if (typeof e == "function")
    return await V(
      t,
      /* isFullFilePath= */
      !0,
      "the provided Wasm module factory"
    ), L(I, {
      fileLocator: t?.fileLocator,
      moduleFactory: e
    });
  const r = e, n = t?.wasmLoaderType === "module" || r.endsWith(".mjs"), o = r.endsWith(".wasm") || r.endsWith(".js") || r.endsWith(".mjs"), s = await V(t, o, r);
  let a = n ? Xe : Je;
  s && (t?.threads ? a = n ? Ze : Ke : t?.jspi ? a = n ? Qe : Ve : a = n ? qe : Ye);
  let i = e;
  if (r.endsWith(".wasm"))
    throw new Error(
      "Please load the `.js` file corresponding to the `.wasm` file, or load the directory containing it."
    );
  if (!r.endsWith(".js") && !r.endsWith(".mjs") && (i = ke(e, a)), n) {
    const l = await tt(i);
    return L(I, {
      fileLocator: t?.fileLocator,
      moduleFactory: l
    });
  }
  return L(I, i, null, null, t?.fileLocator);
}
async function V(e, t, r) {
  const n = await He("relaxedSimd");
  if (e?.threads) {
    if (e?.jspi)
      throw new Error(
        "The `threads` and `jspi` options are mutually exclusive."
      );
    if (t && console.warn(
      `The \`threads\` option was specified, but the wasm path ${r} is a full file path. Whether threads are available or not will depend on the loaded file. To allow LiteRT.js to load the threaded wasm file, use a directory path instead of a full file path.`
    ), !n)
      throw new Error(
        "Threads are only supported with relaxed SIMD, and the current browser does not support relaxed SIMD."
      );
    await K("threads");
  }
  return e?.jspi && (t && console.warn(
    `The \`jspi\` option was specified, but the wasm path ${r} is a full file path. Whether JSPI is available or not will depend on the loaded file. To allow LiteRT.js to load the JSPI wasm file, use a directory path instead of a full file path.`
  ), await K("jspi")), n;
}
async function tt(e) {
  const t = rt(e), r = await import(
    /* @vite-ignore */
    t
  );
  if (typeof r.default != "function")
    throw new Error(
      `LiteRT Wasm ES module ${t} must have a default export module factory.`
    );
  return r.default;
}
function rt(e) {
  const t = e, r = nt();
  if (!r) return t;
  try {
    return new URL(t, r).href;
  } catch {
    return t;
  }
}
function nt() {
  if (typeof document < "u")
    return document.baseURI;
  if (typeof location < "u")
    return location.href;
}
function q(e, t) {
  if (ge())
    throw new Error("LiteRT is already loading / loaded.");
  return z(et(e, t).then(async (r) => (Ee(r), r.setDefaultEnvironment(
    await x.create()
  ), r)).catch((r) => {
    throw z(void 0), r;
  })), le();
}
async function X(e, t = {}) {
  const r = t.environment ?? e.environment, n = w().liteRtWasm, o = e.liteRtTensorBuffer;
  if (o.bufferType().value !== T.HOST_MEMORY)
    throw new Error(
      "Source tensor is not in host memory. Cannot copy to host memory."
    );
  const a = o.lock(
    n.LiteRtTensorBufferLockMode.READ
  );
  let i;
  try {
    i = n.LiteRtTensorBuffer.createManaged(
      r.liteRtEnvironment,
      n.LiteRtTensorBufferType.HOST_MEMORY,
      o.tensorType(),
      o.size()
    );
    const l = i.lock(
      n.LiteRtTensorBufferLockMode.WRITE
    );
    try {
      const f = new Uint8Array(
        n.HEAPU8.buffer,
        a,
        o.size()
      );
      n.HEAPU8.set(f, l);
    } finally {
      i.unlock();
    }
  } finally {
    o.unlock();
  }
  if (!i)
    throw new Error("Failed to create destination tensor buffer.");
  return new g(i, r);
}
async function Z(e, t = {}) {
  const r = t.environment ?? e.environment, n = r.webGpuDevice;
  if (!n)
    throw new Error(
      "No WebGPU device is available. Did you forget to pass a destination environment that has a WebGPU device?"
    );
  const o = w().liteRtWasm, a = e.liteRtTensorBuffer.size() + 3 & -4, i = n.createBuffer({
    size: a,
    usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
    mappedAtCreation: !0
  }), l = await i.getMappedRange(), f = new Uint8Array(l), h = e.liteRtTensorBuffer.lock(
    o.LiteRtTensorBufferLockMode.READ
  );
  try {
    const y = new Uint8Array(
      o.HEAPU8.buffer,
      h,
      e.liteRtTensorBuffer.size()
    );
    f.set(y);
  } finally {
    e.liteRtTensorBuffer.unlock();
  }
  i.unmap();
  const u = n.createBuffer({
    size: a,
    usage: GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST | GPUBufferUsage.STORAGE
  }), d = n.createCommandEncoder();
  return d.copyBufferToBuffer(
    i,
    0,
    u,
    0,
    a
  ), n.queue.submit([d.finish()]), i.destroy(), new g(
    u,
    e.type.layout.dimensions,
    e.type.dtype,
    r,
    () => {
      u.destroy();
    }
  );
}
async function Q(e, t = {}) {
  const r = t.environment ?? e.environment, n = e.environment.webGpuDevice;
  if (!n)
    throw new Error(
      "No WebGPU device is available. Does the source tensor have a WebGPU device?"
    );
  const o = w().liteRtWasm, s = e.liteRtTensorBuffer, a = s.bufferType();
  if (a !== o.LiteRtTensorBufferType.WEB_GPU_BUFFER_PACKED)
    throw new Error(`Cannot convert a tensor with a non-WebGPU buffer type ${a} to a CPU tensor.`);
  const i = o.WebGPU.getJsObject(
    s.getWebGpuBuffer()
  ), l = s.offset(), f = s.tensorType(), h = f.layout(), u = h.numElements(), d = M(f.elementType().value).typedArrayConstructor;
  h.delete(), f.delete();
  let y = i, B = () => {
  };
  if (!(i.usage & GPUBufferUsage.MAP_READ)) {
    y = n.createBuffer({
      size: i.size,
      usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ
    }), B = () => {
      y.destroy();
    };
    const U = n.createCommandEncoder();
    U.copyBufferToBuffer(
      i,
      0,
      y,
      0,
      i.size
    ), n.queue.submit([U.finish()]);
  }
  await y.mapAsync(GPUMapMode.READ);
  const S = y.getMappedRange(), m = new d(S, l, u), A = new g(m, e.type.layout.dimensions, r);
  return y.unmap(), B(), A;
}
function C(e) {
  return async (t, r) => {
    const n = await e(t, r);
    return t.delete(), n;
  };
}
function ot() {
  g.copyFunctions.set(T.HOST_MEMORY, /* @__PURE__ */ new Map([
    [
      T.HOST_MEMORY,
      {
        copyTo: X,
        // There might be a more efficient way to move
        // from CPU to CPU.
        moveTo: C(X)
      }
    ],
    [
      T.WEB_GPU_BUFFER_PACKED,
      {
        copyTo: Z,
        moveTo: C(Z)
      }
    ]
  ])), g.copyFunctions.set(T.WEB_GPU_BUFFER_PACKED, /* @__PURE__ */ new Map([
    [
      T.HOST_MEMORY,
      {
        copyTo: Q,
        moveTo: C(Q)
      }
    ]
  ]));
}
ot();
const b = 512, v = 128, P = b / 2 + 1, G = [
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
], st = {
  sampleRate: 16e3,
  channels: 1,
  frameSize: b,
  frameDuration: 32
};
function it(e) {
  return Number.isFinite(e) && e !== void 0 && e > 0 ? Math.floor(e) : 1;
}
async function at(e) {
  const t = le();
  if (t)
    return t;
  if (e.wasmModuleFactory) {
    if (e.threads)
      throw new Error(
        "Threaded bundled LiteRT loading is not supported yet in the worklet path."
      );
    const r = e.wasmBinary ? (n) => e.wasmModuleFactory({
      ...typeof n == "object" && n !== null ? n : {},
      wasmBinary: e.wasmBinary
    }) : e.wasmModuleFactory;
    return q(r, {
      threads: e.threads
    });
  }
  return q(e.wasmRoot, { threads: e.threads });
}
function lt(e) {
  return Array.from(e, (t) => Number(t));
}
function ee(e) {
  return e.map((t) => ({
    name: t.name,
    index: t.index,
    dtype: t.dtype,
    shape: lt(t.shape)
  }));
}
function te(e) {
  return {
    inputs: ee(e.getInputDetails()),
    outputs: ee(e.getOutputDetails())
  };
}
function re(e, t) {
  const r = e.defaultSignature;
  if (!r || typeof r.signatureIndex != "number" || !r.liteRtModel || !r.liteRtCompiledModel || typeof r.liteRtCompiledModel.run != "function")
    throw new Error(
      `LiteRT.js internal sync runner is unavailable for ${t}. This package currently depends on that API to keep dtln_denoise synchronous.`
    );
  return r;
}
function ut(e) {
  return typeof e == "object" && e !== null && "then" in e && typeof e.then == "function";
}
function ne(e, t) {
  const r = w().liteRtWasm;
  for (let s = 0; s < t.length; s++) {
    const a = t[s], i = e.liteRtModel.getInputTensorType(
      e.signatureIndex,
      s
    ), l = e.liteRtCompiledModel.getInputBufferRequirements(
      e.signatureIndex,
      s
    );
    try {
      r.checkTensorBufferCompatible(
        a.liteRtTensorBuffer,
        i,
        l
      );
    } finally {
      i.delete(), l.delete();
    }
  }
  const n = e.liteRtCompiledModel.run(
    e.signatureIndex,
    t.map((s) => s.liteRtTensorBuffer)
  );
  if (ut(n))
    throw new Error(
      "LiteRT.js returned an async model invocation. AudioWorklet inference requires a synchronous wasm run path."
    );
  const o = g;
  return n.map(
    (s) => new o(s, e.options.environment)
  );
}
function oe(e, t) {
  if (!(t instanceof Float32Array))
    throw new TypeError(`${e} must be a Float32Array`);
}
function F(e) {
  for (const t of e)
    t.delete();
}
function c() {
  return performance.now();
}
function se() {
  return {
    inferCalls: 0,
    denoiseCalls: 0,
    timings: Object.fromEntries(
      G.map((t) => [t, []])
    )
  };
}
function E(e, t, r) {
  e.timings[t].push(r);
}
function ft(e) {
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
function dt(e) {
  const t = /* @__PURE__ */ Object.create(null);
  for (const o of G)
    t[o] = {
      ...ft(e.timings[o]),
      inferShare: 0,
      denoiseShare: 0
    };
  const r = t.infer_total.totalMs, n = t.denoise_total.totalMs;
  for (const o of G) {
    const s = t[o].totalMs;
    t[o].inferShare = r > 0 ? s / r : 0, t[o].denoiseShare = n > 0 ? s / n : 0;
  }
  return {
    inferCalls: e.inferCalls,
    denoiseCalls: e.denoiseCalls,
    stages: t
  };
}
function W(e, t) {
  if (!(t instanceof Float32Array))
    throw new TypeError(`${e} must resolve to Float32Array`);
  return t;
}
function ie(e) {
  return e.createComplexArray();
}
class ct {
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
    if (this.model1Runner = re(t, "model1"), this.model2Runner = re(r, "model2"), this.profilingEnabled = n.profilingEnabled === !0, this.profile = se(), this.model1InputShapes = t.getInputDetails().map((o) => o.shape), this.model2InputShapes = r.getInputDetails().map((o) => o.shape), this.model1InputShapes.length !== 2 || this.model2InputShapes.length !== 2)
      throw new Error("Expected exactly two inputs for each DTLN model");
    this.fft = new ce(b), this.fftSpectrum = ie(this.fft), this.ifftComplex = ie(this.fft), this.inBuffer = new Float32Array(b), this.outBuffer = new Float32Array(b), this.states1 = new Float32Array(b), this.states2 = new Float32Array(b), this.inMag = new Float32Array(P), this.estimatedBlock = new Float32Array(b);
  }
  denoise(t, r) {
    if (oe("inputSamples", t), oe("outputSamples", r), t.length % v !== 0)
      throw new RangeError(
        `inputSamples length must be a multiple of ${v}`
      );
    if (r.length < t.length)
      throw new RangeError("outputSamples must be at least as large as inputSamples");
    const n = this.profilingEnabled ? c() : 0, o = t.length / v;
    for (let s = 0; s < o; s++) {
      const a = s * v;
      this.inBuffer.copyWithin(0, v), this.inBuffer.set(
        t.subarray(a, a + v),
        b - v
      ), this.infer(), r.set(this.outBuffer.subarray(0, v), a);
    }
    return this.profilingEnabled && (this.profile.denoiseCalls++, E(this.profile, "denoise_total", c() - n)), !1;
  }
  getProfile() {
    return dt(this.profile);
  }
  resetProfile() {
    this.profile = se();
  }
  infer() {
    const t = this.profilingEnabled ? c() : 0;
    let r = this.profilingEnabled ? t : 0;
    this.fft.realTransform(this.fftSpectrum, this.inBuffer), this.profilingEnabled && (E(this.profile, "fft", c() - r), r = c());
    for (let u = 0; u < P; u++) {
      const d = u * 2;
      this.inMag[u] = Math.hypot(this.fftSpectrum[d], this.fftSpectrum[d + 1]);
    }
    this.profilingEnabled && (E(this.profile, "magnitude", c() - r), r = c());
    const n = [
      g.fromTypedArray(this.inMag, this.model1InputShapes[0]),
      g.fromTypedArray(this.states1, this.model1InputShapes[1])
    ];
    this.profilingEnabled && (E(this.profile, "model1_tensor", c() - r), r = c());
    let o;
    try {
      o = ne(this.model1Runner, n);
    } finally {
      F(n);
    }
    this.profilingEnabled && (E(this.profile, "model1_invoke", c() - r), r = c());
    const s = W("model1 mask output", o[0].toTypedArray()), a = W(
      "model1 state output",
      o[1].toTypedArray()
    );
    this.states1.set(a), this.profilingEnabled && (E(this.profile, "model1_read", c() - r), r = c());
    for (let u = 0; u < P; u++) {
      const d = u * 2, y = s[u];
      this.fftSpectrum[d] *= y, this.fftSpectrum[d + 1] *= y;
    }
    this.profilingEnabled && (E(this.profile, "mask", c() - r), r = c()), F(o), this.fftSpectrum[1] = 0, this.fftSpectrum[(P - 1) * 2 + 1] = 0, this.fft.completeSpectrum(this.fftSpectrum), this.fft.inverseTransform(this.ifftComplex, this.fftSpectrum);
    for (let u = 0; u < b; u++)
      this.estimatedBlock[u] = this.ifftComplex[u * 2];
    this.profilingEnabled && (E(this.profile, "ifft", c() - r), r = c());
    const i = [
      g.fromTypedArray(this.estimatedBlock, this.model2InputShapes[0]),
      g.fromTypedArray(this.states2, this.model2InputShapes[1])
    ];
    this.profilingEnabled && (E(this.profile, "model2_tensor", c() - r), r = c());
    let l;
    try {
      l = ne(this.model2Runner, i);
    } finally {
      F(i);
    }
    this.profilingEnabled && (E(this.profile, "model2_invoke", c() - r), r = c());
    const f = W("model2 output", l[0].toTypedArray()), h = W(
      "model2 state output",
      l[1].toTypedArray()
    );
    this.states2.set(h), F(l), this.profilingEnabled && (E(this.profile, "model2_read", c() - r), r = c()), this.outBuffer.copyWithin(0, v), this.outBuffer.fill(0, b - v);
    for (let u = 0; u < b; u++) {
      const d = this.outBuffer[u] ?? 0;
      this.outBuffer[u] = d + f[u];
    }
    this.profilingEnabled && (E(this.profile, "overlap_add", c() - r), this.profile.inferCalls++, E(this.profile, "infer_total", c() - t));
  }
}
async function pt(e) {
  const t = e.liteRtWasmRoot, r = e.model1Data ?? e.model1Url, n = e.model2Data ?? e.model2Url, o = e.threads === !0, s = it(e.numThreads), a = e.enableProfiling === !0;
  if (!r)
    throw new Error("Missing model1 source. Provide model1Url or model1Data.");
  if (!n)
    throw new Error("Missing model2 source. Provide model2Url or model2Data.");
  if (!e.liteRtWasmModuleFactory && !t)
    throw new Error(
      "Missing LiteRT runtime source. Provide liteRtWasmRoot or liteRtWasmModuleFactory."
    );
  const i = {
    wasmRoot: t,
    threads: o
  };
  e.liteRtWasmModuleFactory !== void 0 && (i.wasmModuleFactory = e.liteRtWasmModuleFactory), e.liteRtWasmBinary !== void 0 && (i.wasmBinary = e.liteRtWasmBinary), await at(i);
  const l = {
    accelerator: "wasm",
    cpuOptions: {
      numThreads: s
    }
  }, [f, h] = await Promise.all([
    Y(r, l),
    Y(n, l)
  ]), u = {
    model1: te(f),
    model2: te(h),
    threads: o,
    numThreads: s,
    liteRtWasmRoot: t
  };
  e.logModelDetails && console.info("[noise-suppression] model details", u);
  const d = /* @__PURE__ */ new Map();
  let y = 1;
  const B = (m) => {
    const A = d.get(m);
    if (!A)
      throw new Error(`Unknown noise suppression handle: ${m}`);
    return A;
  }, S = {
    ready: Promise.resolve(void 0),
    modelDetails: u,
    audioConfig: st,
    dtln_create() {
      const m = y++;
      return d.set(m, new ct(f, h, { profilingEnabled: a })), m;
    },
    dtln_denoise(m, A, U) {
      return B(m).denoise(A, U);
    },
    dtln_stop(m) {
      d.delete(m);
    },
    dtln_destroy(m) {
      d.delete(m);
    },
    get_profile(m) {
      return B(m).getProfile();
    },
    reset_profile(m) {
      B(m).resetProfile();
    },
    dtln_profile_get(m) {
      return B(m).getProfile();
    },
    dtln_profile_reset(m) {
      B(m).resetProfile();
    }
  };
  return S.ready = Promise.resolve(S), S;
}
async function yt(e = {}) {
  const t = {
    liteRtWasmRoot: e.liteRtWasmRoot ?? Te(),
    model1Url: e.model1Url ?? ye(),
    model2Url: e.model2Url ?? me(),
    threads: he(e.threads),
    numThreads: pe(e.numThreads)
  };
  return e.logModelDetails !== void 0 && (t.logModelDetails = e.logModelDetails), e.enableProfiling !== void 0 && (t.enableProfiling = e.enableProfiling), pt(t);
}
export {
  st as AUDIO_CONFIG,
  yt as createNoiseSuppressionModule,
  pt as createNoiseSuppressionRuntime,
  yt as default
};
//# sourceMappingURL=index.js.map
