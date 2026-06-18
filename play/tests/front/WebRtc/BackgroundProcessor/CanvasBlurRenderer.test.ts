import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    boxBlurImageData,
    CanvasBlurRenderer,
    getCpuBlurRadius,
    getCpuBlurSize,
    resetCanvasBlurRendererForTests,
} from "../../../../src/front/WebRtc/BackgroundProcessor/CanvasBlurRenderer";

describe("CanvasBlurRenderer", () => {
    beforeEach(() => {
        vi.spyOn(console, "info").mockImplementation(() => undefined);
        vi.spyOn(console, "warn").mockImplementation(() => undefined);
    });

    afterEach(() => {
        vi.restoreAllMocks();
        resetCanvasBlurRendererForTests();
    });

    it("uses WebGL blur as the default renderer", () => {
        const renderer = new CanvasBlurRenderer();
        const destinationContext = createDestinationContext();
        const webGlContext = createWebGlContext();
        const webGlCanvas = createCanvas(webGlContext.context);
        const source = createSource();
        mockCanvasCreation(webGlCanvas);

        const backend = renderer.drawBlurredImage(destinationContext.context, source, 640, 360, 25);

        expect(backend).toBe("webgl-blur");
        expect(renderer.getLastBackend()).toBe("webgl-blur");
        expect(webGlCanvas.width).toBe(174);
        expect(webGlCanvas.height).toBe(98);
        expect(webGlContext.texImage2D).toHaveBeenCalledWith(
            webGlContext.context.TEXTURE_2D,
            0,
            webGlContext.context.RGBA,
            webGlContext.context.RGBA,
            webGlContext.context.UNSIGNED_BYTE,
            source,
        );
        expect(webGlContext.pixelStorei).toHaveBeenCalledWith(webGlContext.context.UNPACK_FLIP_Y_WEBGL, false);
        expect(webGlContext.pixelStorei).not.toHaveBeenCalledWith(webGlContext.context.UNPACK_FLIP_Y_WEBGL, true);
        expect(webGlContext.drawArrays).toHaveBeenCalledTimes(5);
        expect(destinationContext.drawImage).toHaveBeenCalledWith(webGlCanvas, 0, 0, 174, 98, 0, 0, 640, 360);
    });

    it("falls back to CPU blur when WebGL is unavailable", () => {
        const renderer = new CanvasBlurRenderer();
        const destinationContext = createDestinationContext();
        const cpuContext = createCpuContext();
        const webGlCanvas = createCanvas(null);
        const cpuCanvas = createCanvas(cpuContext.context);
        const source = createSource();
        mockCanvasCreation(webGlCanvas, cpuCanvas);

        const backend = renderer.drawBlurredImage(destinationContext.context, source, 640, 360, 25);

        expect(backend).toBe("cpu-blur");
        expect(renderer.getLastBackend()).toBe("cpu-blur");
        expect(cpuContext.drawImage).toHaveBeenCalledWith(source, 0, 0, 224, 126);
        expect(cpuContext.getImageData).toHaveBeenCalledWith(0, 0, 224, 126);
        expect(cpuContext.putImageData).toHaveBeenCalledOnce();
        expect(destinationContext.drawImage).toHaveBeenCalledWith(cpuCanvas, 0, 0, 224, 126, 0, 0, 640, 360);
    });

    it("maps the existing blur levels to increasing CPU blur radii", () => {
        const blurSize = getCpuBlurSize(1280, 720);

        expect(getCpuBlurRadius(10, blurSize.scale)).toBeLessThan(getCpuBlurRadius(25, blurSize.scale));
        expect(getCpuBlurRadius(25, blurSize.scale)).toBeLessThan(getCpuBlurRadius(50, blurSize.scale));
    });

    it("spreads a sharp pixel with the CPU blur implementation", () => {
        const data = new Uint8ClampedArray([
            0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255, 255, 0, 0, 0, 255, 0, 0, 0, 255,
        ]);

        boxBlurImageData(data, 5, 1, 1, 1);

        expect(data[4]).toBeGreaterThan(0);
        expect(data[8]).toBeLessThan(255);
        expect(data[12]).toBeGreaterThan(0);
    });

    it("handles invalid dimensions without drawing", () => {
        const renderer = new CanvasBlurRenderer();
        const destinationContext = createDestinationContext();

        const backend = renderer.drawBlurredImage(destinationContext.context, createSource(), 0, 360, 25);

        expect(backend).toBe("none");
        expect(renderer.getLastBackend()).toBe("none");
        expect(destinationContext.drawImage).not.toHaveBeenCalled();
    });
});

function mockCanvasCreation(...canvases: HTMLCanvasElement[]): void {
    let canvasIndex = 0;

    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
        if (tagName !== "canvas") {
            throw new Error(`Unexpected element creation in CanvasBlurRenderer test: ${tagName}`);
        }

        const canvas = canvases[canvasIndex];
        if (!canvas) {
            throw new Error("Unexpected canvas creation in CanvasBlurRenderer test");
        }

        canvasIndex++;
        return canvas;
    });
}

function createCanvas(context: CanvasRenderingContext2D | WebGLRenderingContext | null): HTMLCanvasElement {
    return {
        width: 0,
        height: 0,
        getContext: vi.fn(() => context),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
    } as unknown as HTMLCanvasElement;
}

function createCpuContext() {
    const drawImage = vi.fn();
    const getImageData = vi.fn((x: number, y: number, width: number, height: number) => ({
        data: new Uint8ClampedArray(width * height * 4),
    }));
    const putImageData = vi.fn();
    const context = {
        filter: "none",
        globalCompositeOperation: "source-over",
        drawImage,
        getImageData,
        putImageData,
    } as unknown as CanvasRenderingContext2D;

    return {
        context,
        drawImage,
        getImageData,
        putImageData,
    };
}

function createWebGlContext() {
    const drawArrays = vi.fn();
    const pixelStorei = vi.fn();
    const texImage2D = vi.fn();
    const context = {
        ARRAY_BUFFER: 0x8892,
        BLEND: 0x0be2,
        CLAMP_TO_EDGE: 0x812f,
        COLOR_ATTACHMENT0: 0x8ce0,
        COLOR_BUFFER_BIT: 0x4000,
        COMPILE_STATUS: 0x8b81,
        DEPTH_TEST: 0x0b71,
        FLOAT: 0x1406,
        FRAGMENT_SHADER: 0x8b30,
        FRAMEBUFFER: 0x8d40,
        FRAMEBUFFER_COMPLETE: 0x8cd5,
        LINEAR: 0x2601,
        LINK_STATUS: 0x8b82,
        RGBA: 0x1908,
        STATIC_DRAW: 0x88e4,
        TEXTURE0: 0x84c0,
        TEXTURE_2D: 0x0de1,
        TEXTURE_MAG_FILTER: 0x2800,
        TEXTURE_MIN_FILTER: 0x2801,
        TEXTURE_WRAP_S: 0x2802,
        TEXTURE_WRAP_T: 0x2803,
        TRIANGLES: 0x0004,
        UNPACK_FLIP_Y_WEBGL: 0x9240,
        UNSIGNED_BYTE: 0x1401,
        VERTEX_SHADER: 0x8b31,
        activeTexture: vi.fn(),
        attachShader: vi.fn(),
        bindBuffer: vi.fn(),
        bindFramebuffer: vi.fn(),
        bindTexture: vi.fn(),
        bufferData: vi.fn(),
        checkFramebufferStatus: vi.fn(() => 0x8cd5),
        clear: vi.fn(),
        clearColor: vi.fn(),
        compileShader: vi.fn(),
        createBuffer: vi.fn(() => ({})),
        createFramebuffer: vi.fn(() => ({})),
        createProgram: vi.fn(() => ({})),
        createShader: vi.fn(() => ({})),
        createTexture: vi.fn(() => ({})),
        deleteBuffer: vi.fn(),
        deleteFramebuffer: vi.fn(),
        deleteProgram: vi.fn(),
        deleteShader: vi.fn(),
        deleteTexture: vi.fn(),
        disable: vi.fn(),
        drawArrays,
        enableVertexAttribArray: vi.fn(),
        framebufferTexture2D: vi.fn(),
        getAttribLocation: vi.fn((_program: WebGLProgram, attributeName: string) =>
            attributeName === "a_position" ? 0 : 1,
        ),
        getProgramInfoLog: vi.fn(() => ""),
        getProgramParameter: vi.fn(() => true),
        getShaderInfoLog: vi.fn(() => ""),
        getShaderParameter: vi.fn(() => true),
        getUniformLocation: vi.fn(() => ({})),
        isContextLost: vi.fn(() => false),
        linkProgram: vi.fn(),
        pixelStorei,
        shaderSource: vi.fn(),
        texImage2D,
        texParameteri: vi.fn(),
        uniform1i: vi.fn(),
        uniform1f: vi.fn(),
        uniform2f: vi.fn(),
        useProgram: vi.fn(),
        vertexAttribPointer: vi.fn(),
        viewport: vi.fn(),
        flush: vi.fn(),
    } as unknown as WebGLRenderingContext;

    return {
        context,
        drawArrays,
        pixelStorei,
        texImage2D,
    };
}

function createDestinationContext() {
    const drawImage = vi.fn();
    const context = {
        drawImage,
        imageSmoothingEnabled: false,
        imageSmoothingQuality: "low",
    } as unknown as CanvasRenderingContext2D;

    return {
        context,
        drawImage,
    };
}

function createSource(): CanvasImageSource {
    return { height: 360, width: 640 } as unknown as CanvasImageSource;
}
