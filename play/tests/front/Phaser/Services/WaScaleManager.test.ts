import { describe, expect, it, vi } from "vitest";
import * as Phaser from "phaser";
import type { Game } from "../../../../src/front/Phaser/Game/Game";
import { WaScaleManager } from "../../../../src/front/Phaser/Services/WaScaleManager";

vi.mock("../../../../src/front/Stores/CoWebsiteStore", () => ({
    coWebsiteManager: { getGameSize: () => ({ width: 1200, height: 800 }) },
}));
vi.mock("../../../../src/front/Phaser/Login/ResizableScene", () => ({ ResizableScene: class {} }));

describe("WaScaleManager overlay resolution", () => {
    it("preserves the visible world while keeping overlays sharp and restores resolution on release", () => {
        const manager = new WaScaleManager(640 * 480, 196 * 196);
        const scale = {
            width: 0,
            height: 0,
            resize(width: number, height: number) {
                this.width = width;
                this.height = height;
            },
            setZoom: vi.fn(),
        };
        manager.setGame({
            scale,
            events: new Phaser.Events.EventEmitter(),
            scene: { getScenes: () => [] },
            markDirty: vi.fn(),
        } as unknown as Game);
        const camera = new Phaser.Cameras.Scene2D.Camera(0, 0, 1200, 800);
        manager.setZoomModifier(3, camera);
        const initialWidth = scale.width;
        const visibleWidth = scale.width / camera.zoom;
        const release = manager.requireFullResolution(camera);
        expect(scale.width).toBe(1200 * window.devicePixelRatio);
        // Canvas dimensions are rounded to whole pixels in the low resolution mode.
        expect(Math.abs(scale.width / camera.zoom - visibleWidth)).toBeLessThan(1);
        manager.setZoomModifier(4, camera);
        expect(scale.width).toBe(1200 * window.devicePixelRatio);
        manager.setZoomModifier(3, camera);
        release();
        release();
        expect(scale.width).toBe(initialWidth);
        // Canvas dimensions are rounded to whole pixels in the low resolution mode.
        expect(Math.abs(scale.width / camera.zoom - visibleWidth)).toBeLessThan(1);
    });
});
