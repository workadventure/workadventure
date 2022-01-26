import type OutlinePipelinePlugin from 'phaser3-rex-plugins/plugins/outlinepipeline-plugin.js';
import { isOutlineable } from './CustomTypeGuards';

export interface OutlineConfig {
    thickness: number;
    outlineColor: number;
}

export class OutlineManager {

    private scene: Phaser.Scene;

    private outlinePlugin?: OutlinePipelinePlugin

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.outlinePlugin =
            this.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }

    public tryAddOutline(object: unknown): void {
        if (!isOutlineable(object)) {
            return;
        }
        this.outlinePlugin?.add(object.getObjectToOutline(), object.getOutlineConfig());
    }

    public tryRemoveOutline(object: unknown): void {
        if (!isOutlineable(object)) {
            return;
        }
        this.outlinePlugin?.remove(object.getObjectToOutline());
    }
}