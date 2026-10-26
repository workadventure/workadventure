import * as Phaser from "phaser";
import { afterEach, describe, expect, it, vi } from "vitest";
import { get } from "svelte/store";
import { CameraManager } from "../../../../src/front/Phaser/Game/CameraManager";
import type { GameScene } from "../../../../src/front/Phaser/Game/GameScene";
import type { Player } from "../../../../src/front/Phaser/Player/Player";
import type { WaScaleManager } from "../../../../src/front/Phaser/Services/WaScaleManager";
import { cameraDetachedStore } from "../../../../src/front/Stores/CameraStore";
import { mapEditorModeStore } from "../../../../src/front/Stores/MapEditorStore";
import type { ActiveEventList } from "../../../../src/front/Phaser/UserInput/UserInputManager";
import { UserInputEvent } from "../../../../src/front/Phaser/UserInput/UserInputManager";

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
    mapEditorModeStore.set(false);
    document.body.innerHTML = "";
    vi.restoreAllMocks();
});

function setup(zoom = 1, animate = false, resizeAtEnd = false) {
    // Use the real Phaser camera and preRender so assertions concern the rendered viewport, not just callbacks.
    const camera = new Phaser.Cameras.Scene2D.Camera(0, 0, 800, 600);
    Object.defineProperty(camera, "scaleManager", { value: { zoom: 1, width: 800, height: 600 } });
    Object.defineProperty(camera, "sceneManager", { value: { customViewports: 0 } });
    camera.setZoom(zoom);
    const player = { x: 1200, y: 1000 };
    const sendViewportToServer = vi.fn();
    type TweenConfig = {
        duration: number;
        from: number;
        to: number;
        onUpdate?: (tween: { getValue: () => number }) => void;
        onComplete?: () => void;
    };
    let activeTween: TweenConfig | undefined;
    const advanceTween = (progress: number) => {
        const tween = activeTween;
        if (!tween) return;
        tween.onUpdate?.({ getValue: () => tween.from + (tween.to - tween.from) * progress });
        if (progress === 1) {
            tween.onComplete?.();
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
    let modifier = zoom;
    const limits = { minZoomReached: false };
    const scale = {
        getTargetZoomModifierFor: () => 1,
        get zoomModifier() {
            return modifier;
        },
        get isMaximumZoomOutReached() {
            return limits.minZoomReached;
        },
        setZoomModifier: (value: number, cam: Phaser.Cameras.Scene2D.Camera, animating: boolean) => {
            modifier = value;
            if (resizeAtEnd && !animating) {
                cam.setSize(400, 300);
                cam.setZoom(value / 2);
            } else cam.setZoom(value);
        },
    } as unknown as WaScaleManager;
    const manager = new CameraManager(scene, { width: 4000, height: 3000 }, scale);
    managers.push(manager);
    camera.startFollow(player, true);
    camera.preRender();
    return { camera, manager, player, scene, sendViewportToServer, advanceTween, addCounter, limits };
}

describe("manual camera pan", () => {
    it.each([false, true])(
        "keeps the cursor's world point fixed throughout zoom, including canvas resize=%s",
        (resizeAtEnd) => {
            const { camera, manager, advanceTween } = setup(1, true, resizeAtEnd);
            manager.startManualPan();
            const before = camera.getWorldPoint(600, 150);
            manager.zoomByFactorAtPointer(2, 250, { x: 600, y: 150 });
            advanceTween(0.5);
            camera.preRender();
            const middle = camera.getWorldPoint(camera.width * 0.75, camera.height * 0.25);
            expect(middle.x).toBeCloseTo(before.x);
            expect(middle.y).toBeCloseTo(before.y);
            manager.zoomByFactorAtPointer(1.2, 250, { x: camera.width * 0.75, y: camera.height * 0.25 });
            advanceTween(1);
            camera.preRender();
            const after = camera.getWorldPoint(camera.width * 0.75, camera.height * 0.25);
            expect(after.x).toBeCloseTo(before.x);
            expect(after.y).toBeCloseTo(before.y);
            expect(get(cameraDetachedStore)).toBe(true);
        },
    );

    it("keeps regular zoom centred on the player and recentres after cursor zoom", () => {
        const { camera, manager, player, advanceTween } = setup(1, true);
        manager.zoomByFactor(2, 250);
        advanceTween(1);
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x);
        expect(get(cameraDetachedStore)).toBe(false);
        manager.startManualPan();
        manager.zoomByFactorAtPointer(2, 250, { x: 600, y: 150 });
        advanceTween(1);
        manager.resumePlayerFollow();
        advanceTween(1);
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x);
        expect(camera.midPoint.y).toBe(player.y);
        expect(get(cameraDetachedStore)).toBe(false);
    });

    it.each([0.5, 2])("zooms by %s on the avatar while following, and on the cursor once detached", (factor) => {
        const { camera, manager, player, advanceTween } = setup(2, true);
        manager.zoomByFactorAtPointer(factor, 250, { x: 600, y: 150 });
        advanceTween(1);
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x);
        expect(camera.midPoint.y).toBe(player.y);
        expect(get(cameraDetachedStore)).toBe(false);

        manager.startManualPan();
        const before = camera.getWorldPoint(600, 150);
        manager.zoomByFactorAtPointer(factor, 250, { x: 600, y: 150 });
        advanceTween(1);
        camera.preRender();
        const after = camera.getWorldPoint(600, 150);
        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
    });

    it("zooms on the cursor in the map editor, even after hovering an explorer list item, without detaching", () => {
        const { camera, manager, advanceTween } = setup(1, true);
        mapEditorModeStore.set(true);
        // Hovering an explorer list item makes the camera follow that item.
        manager.centerCameraOn({ x: 1500, y: 1200 });
        advanceTween(1);
        camera.preRender();
        const before = camera.getWorldPoint(600, 150);
        manager.zoomByFactorAtPointer(2, 250, { x: 600, y: 150 });
        advanceTween(1);
        camera.preRender();
        const after = camera.getWorldPoint(600, 150);
        expect(after.x).toBeCloseTo(before.x);
        expect(after.y).toBeCloseTo(before.y);
        expect(get(cameraDetachedStore)).toBe(false);
    });

    it("keeps scrolling the view after centring on a point, as the explorer list does on hover", () => {
        const { camera, manager, advanceTween } = setup(1, true);
        manager.centerCameraOn({ x: 1500, y: 1200 });
        advanceTween(1);
        camera.preRender();
        expect(camera.midPoint.x).toBe(1500);
        manager.scrollCamera(100, 0);
        camera.preRender();
        expect(camera.midPoint.x).toBe(1600);
    });

    it("scrolls the map editor's view with the move keys, then recentres on the avatar when it closes", () => {
        const { camera, manager, player, advanceTween } = setup(2, true);
        mapEditorModeStore.set(true);
        const right = {
            get: (event: UserInputEvent) => event === UserInputEvent.MoveRight,
        } as unknown as ActiveEventList;
        manager.move(right, 100);
        camera.preRender();
        // 0.6 world units per ms at zoom 1, halved at zoom 2 so the map moves as fast on screen.
        expect(camera.midPoint.x).toBeCloseTo(player.x + 30);
        expect(camera.midPoint.y).toBe(player.y);
        mapEditorModeStore.set(false);
        advanceTween(1);
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x);
        expect(camera.midPoint.y).toBe(player.y);
    });

    it("opens the map editor on the avatar, even when a small map held the game view elsewhere", () => {
        const { camera, manager, player } = setup(1);
        player.x = 100;
        player.y = 100;
        manager.startFollowPlayer(player as unknown as Player, 0);
        camera.preRender();
        // In game mode the camera stays inside the map, so it can't centre on an avatar near the corner.
        expect(camera.midPoint.x).toBe(400);
        mapEditorModeStore.set(true);
        camera.preRender();
        expect(camera.midPoint.x).toBe(100);
        expect(camera.midPoint.y).toBe(100);
    });

    it("ends on the avatar when the editor reopens while the view glides back to it", () => {
        const { camera, manager, player, advanceTween } = setup(1, true);
        mapEditorModeStore.set(true);
        manager.scrollCamera(500, 0);
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x + 500);
        mapEditorModeStore.set(false);
        advanceTween(0.5);
        camera.preRender();
        expect(camera.midPoint.x).toBeGreaterThan(player.x);
        mapEditorModeStore.set(true);
        camera.preRender();
        expect(camera.midPoint.x).toBe(player.x);
        expect(camera.midPoint.y).toBe(player.y);
    });

    it("ignores cursor zoom-out at minimum zoom", () => {
        const { manager, addCounter, limits } = setup(1, true);
        manager.startManualPan();
        limits.minZoomReached = true;
        const tweens = addCounter.mock.calls.length;
        manager.zoomByFactorAtPointer(0.5, 250, { x: 600, y: 150 });
        expect(addCounter.mock.calls.length).toBe(tweens);
    });

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
