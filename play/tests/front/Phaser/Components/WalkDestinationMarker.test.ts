import * as Phaser from "phaser";
import { describe, expect, it, vi } from "vitest";
import { WalkDestinationMarker } from "../../../../src/front/Phaser/Components/WalkDestinationMarker";
import type { GameScene } from "../../../../src/front/Phaser/Game/GameScene";

function setup() {
    const graphics = () => {
        const g: Record<string, unknown> = {};
        for (const method of ["lineStyle", "strokeEllipse", "fillStyle", "fillEllipse"]) g[method] = () => g;
        return g;
    };
    const container = {
        visible: true,
        x: 0,
        y: 0,
        scale: 1,
        setDepth: () => container,
        setVisible: (visible: boolean) => ((container.visible = visible), container),
        setPosition: (x: number, y: number) => ((container.x = x), (container.y = y), container),
        setScale: (scale: number) => ((container.scale = scale), container),
        destroy: vi.fn(),
    };
    const ripple = { restart: vi.fn(), pause: vi.fn(), remove: vi.fn() };
    const markDirty = vi.fn();
    const scene = {
        add: { graphics, container: () => container },
        tweens: { add: () => ripple },
        events: new Phaser.Events.EventEmitter(),
        cameras: { main: { zoom: 2 } },
        scale: { displayScale: { x: 0.5 } },
        markDirty,
    } as unknown as GameScene;
    return { marker: new WalkDestinationMarker(scene), container, ripple, scene, markDirty };
}

describe("walk destination marker", () => {
    it("stays while a later walk uses it, and goes when the last walk ends", () => {
        const { marker, container, ripple } = setup();
        expect(container.visible).toBe(false);

        const first = marker.show({ x: 100, y: 50 });
        expect(container.visible).toBe(true);
        expect(ripple.restart).toHaveBeenCalled();

        // A new tap before arrival: the first walk ends after the second one started.
        const second = marker.show({ x: 300, y: 80 });
        marker.hide(first);
        expect(container.visible).toBe(true);
        expect({ x: container.x, y: container.y }).toEqual({ x: 300, y: 80 });

        marker.hide(second);
        expect(container.visible).toBe(false);
        expect(ripple.pause).toHaveBeenCalled();
    });

    it("keeps the same size on screen at every zoom", () => {
        const { marker, container, scene, markDirty } = setup();
        marker.show({ x: 0, y: 0 });
        scene.events.emit(Phaser.Scenes.Events.UPDATE);
        // 0.5 game pixel per CSS pixel, zoomed x2: one CSS pixel is a quarter of a world pixel.
        expect(container.scale).toBe(0.25);
        expect(markDirty).toHaveBeenCalled();
    });
});
