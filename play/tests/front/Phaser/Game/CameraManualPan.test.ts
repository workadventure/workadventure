import * as Phaser from "phaser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { CameraManager } from "../../../../src/front/Phaser/Game/CameraManager";
import type { GameScene } from "../../../../src/front/Phaser/Game/GameScene";
import type { WaScaleManager } from "../../../../src/front/Phaser/Services/WaScaleManager";
import { cameraDetachedStore } from "../../../../src/front/Stores/CameraStore";

vi.mock("../../../../src/front/Phaser/Player/Player", () => ({ hasMovedEventName: "hasMoved" }));
vi.mock("../../../../src/front/Phaser/Services/WaScaleManager", () => ({
    WaScaleManagerEvent: { RefreshFocusOnTarget: "refreshFocus", ZoomChanged: "zoomChanged" },
}));
vi.mock("../../../../src/front/Phaser/UserInput/UserInputManager", () => ({
    UserInputEvent: { MoveLeft: 1, MoveUp: 2, MoveRight: 3, MoveDown: 4 },
}));

const managers: CameraManager[] = [];
afterEach(() => {
    managers.splice(0).forEach((manager) => manager.destroy());
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

function setup(zoom = 1, animate = false) {
    // Use the real Phaser camera and preRender so assertions concern the rendered viewport, not just callbacks.
    const camera = new Phaser.Cameras.Scene2D.Camera(0, 0, 800, 600);
    Object.defineProperty(camera, "scaleManager", { value: { zoom: 1 } });
    camera.setZoom(zoom);
    const player = { x: 1200, y: 1000 };
    const sendViewportToServer = vi.fn();
    type TweenConfig = {
        duration: number;
        onUpdate?: (tween: { getValue: () => number }) => void;
        onComplete?: () => void;
    };
    let activeTween: TweenConfig | undefined;
    const advanceTween = (progress: number) => {
        activeTween?.onUpdate?.({ getValue: () => progress });
        if (progress === 1) {
            activeTween?.onComplete?.();
        }
    };
    const addCounter = vi.fn((config: TweenConfig) => {
        activeTween = config;
        const tween = { getValue: () => 1, stop: vi.fn(), destroy: vi.fn() };
        if (!animate) {
            advanceTween(1);
        }
        return tween;
    });
    const scene = {
        cameras: { main: camera },
        game: { events: new Phaser.Events.EventEmitter() },
        events: new Phaser.Events.EventEmitter(),
        scale: { zoom: 1 },
        CurrentPlayer: player,
        markDirty: vi.fn(),
        reposition: vi.fn(),
        sendViewportToServer,
        tweens: { addCounter },
    } as unknown as GameScene;
    const scale = { getTargetZoomModifierFor: () => 1 } as unknown as WaScaleManager;
    const manager = new CameraManager(scene, { width: 4000, height: 3000 }, scale);
    managers.push(manager);
    camera.startFollow(player, true);
    camera.preRender();
    return { camera, manager, player, scene, sendViewportToServer, advanceTween, addCounter };
}

describe("manual camera pan", () => {
    it.each([0.5, 1, 2])("scales release inertia to the current zoom %s and slows it down", (zoom) => {
        const { camera, manager, scene } = setup(zoom);
        manager.startManualPan();
        manager.releaseManualPan({ x: -8, y: 0 });
        camera.preRender();
        const origin = camera.midPoint.x;
        scene.events.emit(Phaser.Scenes.Events.UPDATE, 0, 20);
        camera.preRender();
        const firstStep = camera.midPoint.x - origin;
        expect(firstStep * zoom).toBeCloseTo(4);
        scene.events.emit(Phaser.Scenes.Events.UPDATE, 20, 20);
        camera.preRender();
        expect(camera.midPoint.x - origin - firstStep).toBeLessThan(firstStep);
    });

    it("gives a fast release more momentum and a stopped pointer none", () => {
        const measure = (velocity: number) => {
            const { manager, scene, camera } = setup();
            manager.startManualPan();
            manager.releaseManualPan({ x: velocity, y: 0 });
            camera.preRender();
            const origin = camera.midPoint.x;
            scene.events.emit(Phaser.Scenes.Events.UPDATE, 0, 20);
            camera.preRender();
            return Math.abs(camera.midPoint.x - origin);
        };
        expect(measure(-8)).toBeGreaterThan(measure(-2));
        expect(measure(0)).toBe(0);
    });

    it("cancels inertia on another drag, resuming player follow, and teardown", () => {
        const { manager, scene } = setup();
        manager.startManualPan();
        manager.releaseManualPan({ x: -8, y: 0 });
        expect(scene.events.listenerCount(Phaser.Scenes.Events.UPDATE)).toBe(1);
        manager.stopManualPanInertia();
        expect(scene.events.listenerCount(Phaser.Scenes.Events.UPDATE)).toBe(0);
        manager.releaseManualPan({ x: -8, y: 0 });
        manager.resumePlayerFollow();
        expect(scene.events.listenerCount(Phaser.Scenes.Events.UPDATE)).toBe(0);
        manager.startManualPan();
        manager.releaseManualPan({ x: -8, y: 0 });
        manager.destroy();
        managers.splice(managers.indexOf(manager), 1);
        expect(scene.events.listenerCount(Phaser.Scenes.Events.UPDATE)).toBe(0);
    });

    it("recenters progressively towards the moving player without restarting on each movement tick", () => {
        const { camera, manager, player, advanceTween, addCounter } = setup(1, true);
        manager.startManualPan();
        manager.panBy(400, 0);
        camera.preRender();
        const originX = camera.midPoint.x;

        manager.resumePlayerFollow();
        camera.preRender();
        expect(camera.midPoint.x).toBe(originX);
        expect(addCounter.mock.calls[0][0].duration).toBe(500);

        player.x += 40;
        advanceTween(0.5);
        camera.preRender();
        expect(camera.midPoint.x).toBe((originX + player.x) / 2);
        manager.resumePlayerFollow();
        expect(addCounter).toHaveBeenCalledTimes(1);

        player.x += 40;
        advanceTween(1);
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x);
        player.x += 20;
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x);
    });

    it.each([0.5, 1, 2])("preserves the initial view and follows pointer distance at zoom %s", (zoom) => {
        const { camera, manager, player, sendViewportToServer } = setup(zoom);
        const before = { x: camera.worldView.x, y: camera.worldView.y };
        manager.startManualPan();
        camera.preRender();
        expect(camera.worldView.x).toBeCloseTo(before.x);
        expect(camera.worldView.y).toBeCloseTo(before.y);
        manager.panBy(-80, 40);
        camera.preRender();
        expect(camera.worldView.x).toBeCloseTo(before.x - 80 / zoom);
        expect(camera.worldView.y).toBeCloseTo(before.y + 40 / zoom);
        expect(player).toEqual({ x: 1200, y: 1000 });
        expect(get(cameraDetachedStore)).toBe(true);
        expect(sendViewportToServer).toHaveBeenCalled();
    });

    it("resumes following the player and clears the recenter state", () => {
        const { camera, manager, player } = setup();
        manager.startManualPan();
        manager.panBy(200, 100);
        camera.preRender();
        manager.resumePlayerFollow();
        player.x += 60;
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x);
        expect(camera.midPoint.y).toBe(player.y);
        expect(get(cameraDetachedStore)).toBe(false);
    });

    it("keeps layout offsets out of a detached view and restores them when recentering", () => {
        const game = document.createElement("div");
        game.id = "game";
        Object.defineProperties(game, { offsetWidth: { value: 800 }, offsetHeight: { value: 600 } });
        document.body.append(game);
        const { camera, manager, player } = setup();
        manager.startManualPan();
        manager.updateCameraOffset({ xStart: 200, xEnd: 800, yStart: 0, yEnd: 600 }, true);
        expect(camera.followOffset.x).toBe(0);
        manager.resumePlayerFollow();
        camera.preRender();
        expect(camera.followOffset.x).toBe(100);
        expect(camera.midPoint.x).toBe(player.x - 100);
    });

    it("clamps the rendered view to the map and clears state on scene teardown", () => {
        const { camera, manager } = setup();
        manager.startManualPan();
        manager.panBy(-10000, -10000);
        camera.preRender();
        expect(camera.worldView.x).toBeGreaterThanOrEqual(0);
        expect(camera.worldView.y).toBeGreaterThanOrEqual(0);
        manager.panBy(20000, 20000);
        camera.preRender();
        expect(camera.worldView.right).toBeLessThanOrEqual(4000);
        expect(camera.worldView.bottom).toBeLessThanOrEqual(3000);
        manager.setExplorationMode();
        expect(get(cameraDetachedStore)).toBe(false);
    });
});
