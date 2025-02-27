import OutlinePipelinePlugin from "phaser3-rex-plugins/plugins/outlinepipeline-plugin.js";
import { DirtyScene } from "../DirtyScene";

/**
 * Temporary solution to fix the issue with the postFX pipeline:
 * https://github.com/photonstorm/phaser/issues/6503
 *
 * TODO: delete this when we migrate to 3.60.1+
 */
export class OutlineManager {
    private scene: DirtyScene;
    private gameObjects: Map<Phaser.GameObjects.GameObject, () => { thickness: number; color?: number }>;
    //private readonly scaleManagerResizeCallback: () => void;

    constructor(scene: DirtyScene) {
        this.scene = scene;
        this.gameObjects = new Map<Phaser.GameObjects.GameObject, () => { thickness: number; color?: number }>();

        /*this.scaleManagerResizeCallback = () => {
            for (const [gameObject, getOutline] of this.gameObjects) {
                this.getOutlinePlugin()?.remove(gameObject);
                const outline = getOutline();
                if (outline.color !== undefined) {
                    this.getOutlinePlugin()?.add(gameObject, {
                        thickness: outline.thickness,
                        outlineColor: outline.color,
                    });
                }
            }
            this.scene.markDirty();
        };

        this.scene.scale.on(Phaser.Scale.Events.RESIZE, this.scaleManagerResizeCallback);*/
    }

    public clear(): void {
        //this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.scaleManagerResizeCallback);
        this.gameObjects.clear();
    }

    public add(
        gameObject: Phaser.GameObjects.GameObject,
        getOutline: () => { thickness: number; color?: number }
    ): void {
        this.gameObjects.set(gameObject, getOutline);

        gameObject.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.getOutlinePlugin()?.remove(gameObject);
            this.gameObjects.delete(gameObject);
        });
    }

    private getOutlinePlugin(): OutlinePipelinePlugin | undefined {
        return this.scene.plugins.get("rexOutlinePipeline") as unknown as OutlinePipelinePlugin | undefined;
    }
}
