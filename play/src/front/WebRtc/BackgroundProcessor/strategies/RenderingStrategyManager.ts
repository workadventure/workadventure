import { IRenderer, BackgroundConfig } from '../interfaces/BackgroundProcessor';
import { WebGL2Renderer } from '../renderers/WebGL2Renderer';
import { Canvas2DRenderer } from '../renderers/Canvas2DRenderer';

/**
 * Strategy pattern implementation for managing different rendering strategies
 * Follows Open/Closed Principle - open for extension, closed for modification
 */
export class RenderingStrategyManager {
    private currentRenderer: IRenderer | null = null;
    private renderers: Map<string, () => IRenderer> = new Map();
    
    constructor() {
        // Register available renderers
        this.registerRenderer('webgl2', () => new WebGL2Renderer());
        this.registerRenderer('canvas2d', () => new Canvas2DRenderer());
    }
    
    /**
     * Register a new renderer type
     * This allows extending with new renderers without modifying existing code
     */
    registerRenderer(type: string, factory: () => IRenderer): void {
        this.renderers.set(type, factory);
    }
    
    /**
     * Initialize the best available renderer
     */
    async initializeBestRenderer(canvas: OffscreenCanvas, preferWebGL = true): Promise<IRenderer> {
        const renderersToTry = preferWebGL 
            ? ['webgl2', 'canvas2d'] 
            : ['canvas2d', 'webgl2'];
        
        for (const rendererType of renderersToTry) {
            const factory = this.renderers.get(rendererType);
            if (!factory) continue;
            
            const renderer = factory();
            const initialized = await renderer.initialize(canvas);
            
            if (initialized) {
                this.currentRenderer = renderer;
                return renderer;
            } else {
                // Clean up failed renderer
                renderer.dispose();
            }
        }
        
        throw new Error('No renderer could be initialized');
    }
    
    /**
     * Get the current renderer
     */
    getCurrentRenderer(): IRenderer | null {
        return this.currentRenderer;
    }
    
    /**
     * Get the type of current renderer
     */
    getCurrentRendererType(): string {
        if (!this.currentRenderer) return 'none';
        
        if (this.currentRenderer instanceof WebGL2Renderer) return 'webgl2';
        if (this.currentRenderer instanceof Canvas2DRenderer) return 'canvas2d';
        
        return 'unknown';
    }
    
    /**
     * Dispose of current renderer
     */
    dispose(): void {
        if (this.currentRenderer) {
            this.currentRenderer.dispose();
            this.currentRenderer = null;
        }
    }
}
