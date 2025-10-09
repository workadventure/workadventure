import { IRenderer, BackgroundConfig } from '../interfaces/BackgroundProcessor';

/**
 * Canvas 2D renderer implementation as fallback
 * Follows Single Responsibility Principle - only handles Canvas2D rendering
 */
export class Canvas2DRenderer implements IRenderer {
    private canvas: OffscreenCanvas | null = null;
    private ctx: OffscreenCanvasRenderingContext2D | null = null;
    private backgroundImage: ImageBitmap | null = null;
    private backgroundVideo: HTMLVideoElement | null = null;
    
    async initialize(canvas: OffscreenCanvas): Promise<boolean> {
        try {
            const ctx = canvas.getContext('2d', {
                alpha: false,
                desynchronized: true
            });
            
            if (!ctx) {
                return false;
            }
            
            this.canvas = canvas;
            this.ctx = ctx;
            
            return true;
        } catch (error) {
            console.error('Canvas2D initialization failed:', error);
            return false;
        }
    }
    
    async render(frame: VideoFrame, mask: Float32Array | null, config: BackgroundConfig): Promise<void> {
        if (!this.ctx || !this.canvas) {
            throw new Error('Canvas2D not initialized');
        }
        
        const { width, height } = this.canvas;
        
        // Fast path for no processing
        if (config.mode === 'none' || !mask) {
            this.ctx.drawImage(frame, 0, 0, width, height);
            return;
        }
        
        // Create temporary canvas for compositing
        const tempCanvas = new OffscreenCanvas(width, height);
        const tempCtx = tempCanvas.getContext('2d');
        if (!tempCtx) throw new Error('Failed to create temporary context');
        
        switch (config.mode) {
            case 'blur':
                await this.renderBlurMode(frame, mask, config, tempCanvas, tempCtx);
                break;
                
            case 'image':
                await this.renderImageMode(frame, mask, tempCanvas, tempCtx);
                break;
                
            case 'video':
                await this.renderVideoMode(frame, mask, tempCanvas, tempCtx);
                break;
        }
    }
    
    private async renderBlurMode(
        frame: VideoFrame, 
        mask: Float32Array, 
        config: BackgroundConfig,
        tempCanvas: OffscreenCanvas,
        tempCtx: OffscreenCanvasRenderingContext2D
    ): Promise<void> {
        if (!this.ctx) return;
        
        const { width, height } = this.canvas!;
        
        // Draw blurred background
        this.ctx.filter = `blur(${config.blurAmount || 10}px)`;
        this.ctx.drawImage(frame, 0, 0, width, height);
        this.ctx.filter = 'none';
        
        // Draw sharp person with mask
        tempCtx.drawImage(frame, 0, 0, width, height);
        
        // Apply mask
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        // Apply mask with smoothing
        for (let i = 0; i < mask.length; i++) {
            const maskValue = mask[i];
            const alpha = this.smoothstep(0.4, 0.6, maskValue) * 255;
            pixels[i * 4 + 3] = alpha;
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        this.ctx.drawImage(tempCanvas, 0, 0, width, height);
    }
    
    private async renderImageMode(
        frame: VideoFrame,
        mask: Float32Array,
        tempCanvas: OffscreenCanvas,
        tempCtx: OffscreenCanvasRenderingContext2D
    ): Promise<void> {
        if (!this.ctx || !this.backgroundImage) return;
        
        const { width, height } = this.canvas!;
        
        // Draw background image
        this.ctx.drawImage(this.backgroundImage, 0, 0, width, height);
        
        // Draw person with mask
        tempCtx.drawImage(frame, 0, 0, width, height);
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        for (let i = 0; i < mask.length; i++) {
            const maskValue = mask[i];
            const alpha = this.smoothstep(0.4, 0.6, maskValue) * 255;
            pixels[i * 4 + 3] = alpha;
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        this.ctx.drawImage(tempCanvas, 0, 0, width, height);
    }
    
    private async renderVideoMode(
        frame: VideoFrame,
        mask: Float32Array,
        tempCanvas: OffscreenCanvas,
        tempCtx: OffscreenCanvasRenderingContext2D
    ): Promise<void> {
        if (!this.ctx || !this.backgroundVideo) return;
        
        const { width, height } = this.canvas!;
        
        // Draw background video
        this.ctx.drawImage(this.backgroundVideo, 0, 0, width, height);
        
        // Draw person with mask
        tempCtx.drawImage(frame, 0, 0, width, height);
        const imageData = tempCtx.getImageData(0, 0, width, height);
        const pixels = imageData.data;
        
        for (let i = 0; i < mask.length; i++) {
            const maskValue = mask[i];
            const alpha = this.smoothstep(0.4, 0.6, maskValue) * 255;
            pixels[i * 4 + 3] = alpha;
        }
        
        tempCtx.putImageData(imageData, 0, 0);
        this.ctx.drawImage(tempCanvas, 0, 0, width, height);
    }
    
    /**
     * Smoothstep function for edge smoothing
     */
    private smoothstep(edge0: number, edge1: number, x: number): number {
        const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
        return t * t * (3 - 2 * t);
    }
    
    async updateBackground(config: BackgroundConfig): Promise<void> {
        // Load background image
        if (config.backgroundImage) {
            try {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                
                await new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    img.src = config.backgroundImage!;
                });
                
                this.backgroundImage = await createImageBitmap(img);
            } catch (error) {
                console.warn('Failed to load background image:', error);
            }
        }
        
        // Load background video
        if (config.backgroundVideo) {
            try {
                const video = document.createElement('video');
                video.src = config.backgroundVideo;
                video.loop = true;
                video.muted = true;
                video.crossOrigin = 'anonymous';
                
                await video.play();
                this.backgroundVideo = video;
            } catch (error) {
                console.warn('Failed to load background video:', error);
            }
        }
    }
    
    dispose(): void {
        this.ctx = null;
        this.canvas = null;
        this.backgroundImage = null;
        
        if (this.backgroundVideo) {
            this.backgroundVideo.pause();
            this.backgroundVideo = null;
        }
    }
}
