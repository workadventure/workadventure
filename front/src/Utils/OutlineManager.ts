import type OutlinePipelinePlugin from 'phaser3-rex-plugins/plugins/outlinepipeline-plugin.js';
import type { OutlineableInterface } from '../Phaser/Game/OutlineableInterface';
import { isOutlineable } from './CustomTypeGuards';

export interface OutlineConfig {
    thickness: number;
    outlineColor: number;
}

export class OutlineManager {

    private scene: Phaser.Scene;

    private objectsWithOutline: OutlineableInterface[];

    private outlinePlugin?: OutlinePipelinePlugin

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
        this.objectsWithOutline = [];
        this.outlinePlugin =
            this.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }

    public tryAddOutline(object: unknown): void {
        if (!isOutlineable(object) || this.objectsWithOutline.includes(object)) {
            return;
        }
        this.outlinePlugin?.add(object.getObjectToOutline(), object.getOutlineConfig());
        this.objectsWithOutline.push(object);
    }

    public tryRemoveOutline(object: unknown): void {
        if (!isOutlineable(object) || !this.objectsWithOutline.includes(object)) {
            return;
        }
        this.outlinePlugin?.remove(object.getObjectToOutline());
        const index = this.objectsWithOutline.findIndex(obj => obj === object);
        if (index === -1) {
            return;
        }
        this.objectsWithOutline.splice(index, 1);
    }
}