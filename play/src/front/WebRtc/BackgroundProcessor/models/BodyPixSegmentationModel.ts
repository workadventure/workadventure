import * as bodyPix from '@tensorflow-models/body-pix';
import { ISegmentationModel } from '../interfaces/BackgroundProcessor';

/**
 * BodyPix segmentation model implementation
 * Follows Single Responsibility Principle - only handles segmentation
 */
export class BodyPixSegmentationModel implements ISegmentationModel {
    private model: bodyPix.BodyPix | null = null;
    private modelConfig: bodyPix.ModelConfig;
    
    constructor(modelConfig?: Partial<bodyPix.ModelConfig>) {
        this.modelConfig = {
            architecture: 'MobileNetV1',
            outputStride: 16,
            multiplier: 0.75,
            quantBytes: 2,
            ...modelConfig
        };
    }
    
    async load(): Promise<void> {
        if (this.model) {
            return; // Already loaded
        }
        
        try {
            this.model = await bodyPix.load(this.modelConfig);
        } catch (error) {
            throw new Error(`Failed to load BodyPix model: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    async segment(input: VideoFrame | OffscreenCanvas): Promise<Float32Array> {
        if (!this.model) {
            throw new Error('Model not loaded. Call load() first.');
        }
        
        try {
            // Convert VideoFrame to canvas if needed
            let canvas: OffscreenCanvas;
            if (input instanceof VideoFrame) {
                canvas = new OffscreenCanvas(input.displayWidth, input.displayHeight);
                const ctx = canvas.getContext('2d');
                if (!ctx) throw new Error('Failed to get 2D context');
                ctx.drawImage(input, 0, 0);
            } else {
                canvas = input;
            }
            
            // Run segmentation with optimized settings
            const segmentation = await this.model.segmentPerson(canvas as any, {
                flipHorizontal: false,
                internalResolution: 'medium',
                segmentationThreshold: 0.7,
                maxDetections: 1,
                scoreThreshold: 0.3,
                nmsRadius: 20
            });
            
            // Convert binary mask to Float32Array
            const maskData = segmentation.data;
            const float32Mask = new Float32Array(maskData.length);
            
            for (let i = 0; i < maskData.length; i++) {
                float32Mask[i] = maskData[i] ? 1.0 : 0.0;
            }
            
            return float32Mask;
        } catch (error) {
            throw new Error(`Segmentation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    
    dispose(): void {
        if (this.model) {
            this.model.dispose();
            this.model = null;
        }
    }
}
