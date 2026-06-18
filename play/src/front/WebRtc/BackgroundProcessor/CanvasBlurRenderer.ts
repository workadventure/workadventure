export type BlurBackend = "cpu-blur" | "none";

const CPU_BLUR_MAX_SIDE = 224;
const CPU_BLUR_ITERATIONS = 2;

const loggedBackends = new Set<BlurBackend>();
let loggedCpuFailure = false;

export function resetCanvasBlurRendererForTests(): void {
    loggedBackends.clear();
    loggedCpuFailure = false;
}

export function getCpuBlurSize(width: number, height: number): { width: number; height: number; scale: number } {
    const maxSide = Math.max(width, height);
    if (maxSide <= 0) {
        return { width: 0, height: 0, scale: 0 };
    }

    const scale = Math.min(1, CPU_BLUR_MAX_SIDE / maxSide);
    return {
        width: Math.max(1, Math.round(width * scale)),
        height: Math.max(1, Math.round(height * scale)),
        scale,
    };
}

export function getCpuBlurRadius(blurAmount: number, scale: number): number {
    if (blurAmount <= 0 || scale <= 0) {
        return 0;
    }

    return Math.max(1, Math.min(18, Math.round(blurAmount * scale * 0.75)));
}

export function boxBlurImageData(
    data: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
    iterations = CPU_BLUR_ITERATIONS,
): void {
    if (width <= 0 || height <= 0 || radius <= 0 || iterations <= 0) {
        return;
    }

    const source = new Uint8ClampedArray(data);
    const target = new Uint8ClampedArray(data.length);

    for (let iteration = 0; iteration < iterations; iteration++) {
        boxBlurHorizontal(source, target, width, height, radius);
        boxBlurVertical(target, source, width, height, radius);
    }

    data.set(source);
}

function boxBlurHorizontal(
    source: Uint8ClampedArray,
    target: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
): void {
    const windowSize = radius * 2 + 1;

    for (let y = 0; y < height; y++) {
        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 0;

        for (let offset = -radius; offset <= radius; offset++) {
            const x = clamp(offset, 0, width - 1);
            const index = (y * width + x) * 4;
            red += source[index];
            green += source[index + 1];
            blue += source[index + 2];
            alpha += source[index + 3];
        }

        for (let x = 0; x < width; x++) {
            const index = (y * width + x) * 4;
            target[index] = red / windowSize;
            target[index + 1] = green / windowSize;
            target[index + 2] = blue / windowSize;
            target[index + 3] = alpha / windowSize;

            const removeX = clamp(x - radius, 0, width - 1);
            const addX = clamp(x + radius + 1, 0, width - 1);
            const removeIndex = (y * width + removeX) * 4;
            const addIndex = (y * width + addX) * 4;

            red += source[addIndex] - source[removeIndex];
            green += source[addIndex + 1] - source[removeIndex + 1];
            blue += source[addIndex + 2] - source[removeIndex + 2];
            alpha += source[addIndex + 3] - source[removeIndex + 3];
        }
    }
}

function boxBlurVertical(
    source: Uint8ClampedArray,
    target: Uint8ClampedArray,
    width: number,
    height: number,
    radius: number,
): void {
    const windowSize = radius * 2 + 1;

    for (let x = 0; x < width; x++) {
        let red = 0;
        let green = 0;
        let blue = 0;
        let alpha = 0;

        for (let offset = -radius; offset <= radius; offset++) {
            const y = clamp(offset, 0, height - 1);
            const index = (y * width + x) * 4;
            red += source[index];
            green += source[index + 1];
            blue += source[index + 2];
            alpha += source[index + 3];
        }

        for (let y = 0; y < height; y++) {
            const index = (y * width + x) * 4;
            target[index] = red / windowSize;
            target[index + 1] = green / windowSize;
            target[index + 2] = blue / windowSize;
            target[index + 3] = alpha / windowSize;

            const removeY = clamp(y - radius, 0, height - 1);
            const addY = clamp(y + radius + 1, 0, height - 1);
            const removeIndex = (removeY * width + x) * 4;
            const addIndex = (addY * width + x) * 4;

            red += source[addIndex] - source[removeIndex];
            green += source[addIndex + 1] - source[removeIndex + 1];
            blue += source[addIndex + 2] - source[removeIndex + 2];
            alpha += source[addIndex + 3] - source[removeIndex + 3];
        }
    }
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value));
}

function logSelectedBackend(backend: BlurBackend): void {
    if (backend === "none" || loggedBackends.has(backend)) {
        return;
    }

    loggedBackends.add(backend);
    console.info("[BackgroundProcessor] Using CPU background blur renderer.");
}

export class CanvasBlurRenderer {
    private cpuCanvas: HTMLCanvasElement | null = null;
    private cpuContext: CanvasRenderingContext2D | null = null;
    private lastBackend: BlurBackend = "none";

    public getLastBackend(): BlurBackend {
        return this.lastBackend;
    }

    public drawBlurredImage(
        destinationContext: CanvasRenderingContext2D,
        source: CanvasImageSource,
        width: number,
        height: number,
        blurAmount = 15,
    ): BlurBackend {
        if (!width || !height || width <= 0 || height <= 0) {
            this.lastBackend = "none";
            return this.lastBackend;
        }

        this.lastBackend = this.drawWithCpuBlur(destinationContext, source, width, height, blurAmount);
        logSelectedBackend(this.lastBackend);
        return this.lastBackend;
    }

    public close(): void {
        this.cpuCanvas = null;
        this.cpuContext = null;
        this.lastBackend = "none";
    }

    private drawWithCpuBlur(
        destinationContext: CanvasRenderingContext2D,
        source: CanvasImageSource,
        width: number,
        height: number,
        blurAmount: number,
    ): BlurBackend {
        try {
            const cpuContext = this.getCpuContext();
            const blurSize = getCpuBlurSize(width, height);

            if (!blurSize.width || !blurSize.height) {
                return "none";
            }

            if (
                !this.cpuCanvas ||
                this.cpuCanvas.width !== blurSize.width ||
                this.cpuCanvas.height !== blurSize.height
            ) {
                this.cpuCanvas = this.cpuCanvas ?? document.createElement("canvas");
                this.cpuCanvas.width = blurSize.width;
                this.cpuCanvas.height = blurSize.height;
            }

            cpuContext.filter = "none";
            cpuContext.globalCompositeOperation = "source-over";
            cpuContext.drawImage(source, 0, 0, blurSize.width, blurSize.height);

            const imageData = cpuContext.getImageData(0, 0, blurSize.width, blurSize.height);
            const radius = getCpuBlurRadius(blurAmount, blurSize.scale);
            boxBlurImageData(imageData.data, blurSize.width, blurSize.height, radius);
            cpuContext.putImageData(imageData, 0, 0);

            const previousImageSmoothingEnabled = destinationContext.imageSmoothingEnabled;
            const previousImageSmoothingQuality = destinationContext.imageSmoothingQuality;
            destinationContext.imageSmoothingEnabled = true;
            destinationContext.imageSmoothingQuality = "high";
            destinationContext.drawImage(this.cpuCanvas, 0, 0, blurSize.width, blurSize.height, 0, 0, width, height);
            destinationContext.imageSmoothingEnabled = previousImageSmoothingEnabled;
            destinationContext.imageSmoothingQuality = previousImageSmoothingQuality;

            return "cpu-blur";
        } catch (error) {
            if (!loggedCpuFailure) {
                loggedCpuFailure = true;
                console.warn("[BackgroundProcessor] CPU blur renderer failed; drawing the unblurred frame.", error);
            }
            destinationContext.drawImage(source, 0, 0, width, height);
            return "none";
        }
    }

    private getCpuContext(): CanvasRenderingContext2D {
        if (!this.cpuCanvas) {
            this.cpuCanvas = document.createElement("canvas");
        }

        if (!this.cpuContext) {
            this.cpuContext = this.cpuCanvas.getContext("2d", { willReadFrequently: true });
            if (!this.cpuContext) {
                throw new Error("Unable to create CPU blur canvas context");
            }
        }

        return this.cpuContext;
    }
}
