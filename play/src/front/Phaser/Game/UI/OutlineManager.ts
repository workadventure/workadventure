import * as Phaser from "phaser";
import type OutlineFilterPlugin from "phaser4-rex-plugins/plugins/outlinefilter-plugin.js";
import type { OutlineController } from "phaser4-rex-plugins/plugins/outlinefilter.js";
import type { DirtyScene } from "../DirtyScene";

import GameObject = Phaser.GameObjects.GameObject;

type Outline = { thickness: number; color?: number };
type OutlineEntry = {
    getOutline: () => Outline;
    controller?: OutlineController;
    currentOutline?: Outline;
};

type FilterableGameObject = GameObject & {
    filters?: Phaser.Types.GameObjects.FiltersInternalExternal | null;
};

export class OutlineManager {
    private readonly scene: DirtyScene;
    private readonly gameObjects: Map<GameObject, OutlineEntry>;
    //private readonly scaleManagerResizeCallback: () => void;

    constructor(scene: DirtyScene) {
        this.scene = scene;
        this.gameObjects = new Map<GameObject, OutlineEntry>();
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

        const outline = entry.getOutline();
        const nextOutline = outline.color === undefined ? undefined : outline;
        if (
            entry.currentOutline?.thickness === nextOutline?.thickness &&
            entry.currentOutline?.color === nextOutline?.color
        ) {
            return;
        }

        this.removeOutline(gameObject, entry);
        entry.currentOutline = nextOutline;

        if (nextOutline === undefined) {
            this.scene.markDirty();
            return;
        }

        entry.controller = this.getOutlinePlugin()?.add(gameObject, {
            thickness: nextOutline.thickness,
            outlineColor: nextOutline.color,
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
        this.scene.markDirty();
    }

    private getOutlinePlugin(): OutlineFilterPlugin | undefined {
        return this.scene.plugins.get("rexOutlineFilter") as unknown as OutlineFilterPlugin | undefined;
    }
}
