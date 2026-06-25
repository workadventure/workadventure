import * as Phaser from "phaser";
import type OutlineFilterPlugin from "phaser4-rex-plugins/plugins/outlinefilter-plugin.js";
import type { OutlineController } from "phaser4-rex-plugins/plugins/outlinefilter.js";
import type { DirtyScene } from "../DirtyScene";

import GameObject = Phaser.GameObjects.GameObject;

type Outline = { thickness: number; color?: number };
type OutlineEntry = {
    getOutline: () => Outline;
    controller?: OutlineController;
};

type FilterableGameObject = GameObject & {
    filters?: Phaser.Types.GameObjects.FiltersInternalExternal | null;
};

/**
 * Temporary solution to fix the issue with the postFX pipeline:
 * https://github.com/photonstorm/phaser/issues/6503
 *
 * TODO: delete this when we migrate to 3.60.1+
 */
export class OutlineManager {
    private scene: DirtyScene;
    private gameObjects: Map<GameObject, OutlineEntry>;
    //private readonly scaleManagerResizeCallback: () => void;

    constructor(scene: DirtyScene) {
        this.scene = scene;
        this.gameObjects = new Map<GameObject, OutlineEntry>();

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
        for (const [gameObject, entry] of this.gameObjects) {
            this.removeOutline(gameObject, entry);
        }
        this.gameObjects.clear();
    }

    public add(gameObject: GameObject, getOutline: () => Outline): void {
        const entry: OutlineEntry = { getOutline };
        this.gameObjects.set(gameObject, entry);

        gameObject.once(Phaser.GameObjects.Events.DESTROY, () => {
            this.removeOutline(gameObject, entry);
            this.gameObjects.delete(gameObject);
        });
    }

    public update(gameObject: GameObject): void {
        const entry = this.gameObjects.get(gameObject);
        if (!entry) {
            return;
        }

        this.removeOutline(gameObject, entry);

        const outline = entry.getOutline();
        if (outline.color === undefined) {
            this.scene.markDirty();
            return;
        }

        entry.controller = this.getOutlinePlugin()?.add(gameObject, {
            thickness: outline.thickness,
            outlineColor: outline.color,
        });
        this.scene.markDirty();
    }

    private removeOutline(gameObject: GameObject, entry: OutlineEntry): void {
        const filters = (gameObject as FilterableGameObject).filters;
        if (!filters || !entry.controller) {
            return;
        }

        filters.internal.remove(entry.controller, true);
        entry.controller = undefined;
    }

    private getOutlinePlugin(): OutlineFilterPlugin | undefined {
        return this.scene.plugins.get("rexOutlineFilter") as unknown as OutlineFilterPlugin | undefined;
    }
}
