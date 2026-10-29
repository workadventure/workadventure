import * as Phaser from "phaser";
import { PositionMessage_Direction } from "@workadventure/messages";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { GameScene } from "../../../../src/front/Phaser/Game/GameScene";
import { MinimapManager } from "../../../../src/front/Phaser/Game/MinimapManager";

vi.mock("../../../../src/front/Phaser/Services/WaScaleManager", () => ({
    waScaleManager: { requireFullResolution: vi.fn(() => vi.fn()) },
}));

vi.mock("../../../../src/front/Phaser/ECS/Entity", () => ({ Entity: class {} }));

afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

function setup(overview = false) {
    const disconnect = vi.fn();
    vi.stubGlobal(
        "ResizeObserver",
        class {
            observe = vi.fn();
            disconnect = disconnect;
        },
    );
    const mini = new Phaser.Cameras.Scene2D.Camera(0, 0, 1, 1);
    Object.defineProperty(mini, "id", { value: 2 });
    const main = new Phaser.Cameras.Scene2D.Camera(0, 0, 800, 600);
    Object.defineProperty(main, "id", { value: 1 });
    Object.defineProperty(mini, "cameraManager", { value: { default: main } });
    main.centerOn(1200, 1000);
    main.preRender();
    const events = new Phaser.Events.EventEmitter();
    const scale = new Phaser.Events.EventEmitter();
    const phaserScene = new Phaser.Scene();
    vi.spyOn(phaserScene.sys, "queueDepthSort").mockImplementation(() => {});
    const avatar = new Phaser.GameObjects.GameObject(phaserScene, "Container");
    const tiles = new Phaser.GameObjects.GameObject(phaserScene, "TilemapLayer");
    const marker = new Phaser.GameObjects.Container(phaserScene);
    avatar.cameraFilter = 4;
    const player = {
        x: 1200,
        y: 1000,
        lastDirection: PositionMessage_Direction.RIGHT,
        sprites: new Map<string, Phaser.GameObjects.Sprite>(),
    };
    const removeCamera = vi.fn();
    const mask = {
        clear: vi.fn().mockReturnThis(),
        fillStyle: vi.fn().mockReturnThis(),
        fillRoundedRect: vi.fn().mockReturnThis(),
        createGeometryMask: vi.fn(() => ({})),
        destroy: vi.fn(),
    };
    const background = {
        camera: new Phaser.Cameras.Scene2D.Camera(0, 0, 4000, 3000),
        texture: { source: [] },
        setOrigin: vi.fn().mockReturnThis(),
        setDisplaySize: vi.fn().mockReturnThis(),
        clear: vi.fn().mockReturnThis(),
        draw: vi.fn().mockReturnThis(),
        render: vi.fn().mockReturnThis(),
        destroy: vi.fn(),
    };
    const moveTo = vi.fn().mockResolvedValue({});
    const domContainer = document.createElement("div");
    domContainer.style.clipPath = "inset(0px)";
    Object.defineProperties(domContainer, { clientWidth: { value: 800 }, clientHeight: { value: 600 } });
    vi.spyOn(domContainer, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 800, 600));
    const areas = new Map([
        ["meeting", { id: "meeting", name: "Meeting room", x: 1100, y: 900, width: 200, height: 200 }],
        ["empty", { id: "empty", name: " ", x: 0, y: 0, width: 20, height: 20 }],
        ["outside", { id: "outside", name: "Outside", x: 3900, y: 2900, width: 50, height: 50 }],
    ]);
    const scene = {
        userInputManager: { isRightClickEnabled: true },
        getCameraManager: () => ({ resumePlayerFollow: vi.fn() }),
        moveTo,
        getGameMapFrontWrapper: () => ({
            getAreas: () => areas,
        }),
        cameras: { main, default: main, add: vi.fn(() => mini), remove: removeCamera },
        CurrentPlayer: player,
        Map: { widthInPixels: 4000, heightInPixels: 3000, tilesets: [] },
        game: {
            domContainer,
            canvas: { getBoundingClientRect: () => ({ x: 0, y: 0, width: 800, height: 600 }) },
            renderer: Object.assign(new Phaser.Events.EventEmitter(), { type: Phaser.CANVAS }),
        },
        children: { getChildren: () => [tiles, avatar, marker] },
        add: { container: () => marker, existing: vi.fn() },
        make: { graphics: () => mask, renderTexture: vi.fn(() => background) },
        events,
        scale: Object.assign(scale, { gameSize: { width: 800, height: 600 } }),
        markDirty: vi.fn(),
    } as unknown as GameScene;
    const element = document.createElement("button");
    vi.spyOn(element, "getBoundingClientRect").mockReturnValue(new DOMRect(16, 390, 240, 190));
    Object.defineProperty(element, "clientWidth", { value: 240 });
    const onUpdate = vi.fn();
    const manager = new MinimapManager(scene, element, overview, onUpdate);
    return {
        manager,
        areas,
        background,
        scene,
        mini,
        main,
        events,
        avatar,
        tiles,
        marker,
        player,
        onUpdate,
        disconnect,
        removeCamera,
        element,
        moveTo,
    };
}

describe("MinimapManager", () => {
    it("updates markers after adding, renaming and deleting zones without rebuilding the background", () => {
        const { manager, areas, events, onUpdate, background } = setup();
        areas.set("new", { id: "new", name: "New room", x: 1200, y: 1000, width: 20, height: 20 });
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        expect(onUpdate.mock.lastCall?.[0].areas).toContainEqual(
            expect.objectContaining({ id: "new", name: "New room" }),
        );
        const area = areas.get("new");
        if (!area) throw new Error("Missing test area");
        area.name = "Renamed room";
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        expect(onUpdate.mock.lastCall?.[0].areas).toContainEqual(
            expect.objectContaining({ id: "new", name: "Renamed room" }),
        );
        areas.delete("new");
        areas.delete("meeting");
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        expect(onUpdate.mock.lastCall?.[0].areas).toEqual([]);
        expect(background.draw).toHaveBeenCalledTimes(1);
        manager.destroy();
    });

    it("reuses the background while moving and zooming, and rebuilds when scenery changes", () => {
        const { manager, background, mini, tiles, player, events } = setup();
        expect(background.draw).toHaveBeenCalledTimes(1);
        expect(background.draw).toHaveBeenCalledWith([tiles]);
        expect(tiles.cameraFilter & mini.id).toBe(mini.id);
        player.x += 50;
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        manager.setZoomLevel(2);
        expect(background.draw).toHaveBeenCalledTimes(1);
        events.emit(Phaser.Scenes.Events.ADDED_TO_SCENE, tiles);
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        expect(background.draw).toHaveBeenCalledTimes(2);
        tiles.renderFlags = 0;
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        expect(background.draw).toHaveBeenLastCalledWith([]);
        expect(background.draw).toHaveBeenCalledTimes(3);
        manager.destroy();
        expect(background.destroy).toHaveBeenCalledTimes(1);
        expect(tiles.cameraFilter).toBe(0);
    });

    it("freezes tile animation only for the minimap render pass and restores the main view", () => {
        const { manager, scene, mini, main } = setup();
        const layer = Object.create(Phaser.Tilemaps.TilemapGPULayer.prototype) as Phaser.Tilemaps.TilemapGPULayer;
        layer.timeElapsed = 1250;
        const objects = scene.children.getChildren();
        vi.spyOn(scene.children, "getChildren").mockReturnValue([...objects, layer]);
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, main);
        expect(layer.timeElapsed).toBe(1250);
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, mini);
        expect(layer.timeElapsed).toBe(0);
        scene.game.renderer.emit(Phaser.Renderer.Events.POST_RENDER);
        expect(layer.timeElapsed).toBe(1250);
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, mini);
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, main);
        expect(layer.timeElapsed).toBe(1250);
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, mini);
        manager.destroy();
        expect(layer.timeElapsed).toBe(1250);
    });

    it("pans with captured pointers, stays detached, suppresses the release click and recentres", () => {
        const { manager, element, mini, main, events, player } = setup();
        const capture = vi.fn();
        element.setPointerCapture = capture;
        element.hasPointerCapture = vi.fn(() => true);
        element.releasePointerCapture = vi.fn();
        const pointer = (type: string, x: number, y: number) => {
            const event = new MouseEvent(type, { clientX: x, clientY: y, button: 0 });
            Object.defineProperty(event, "pointerId", { value: 7 });
            element.dispatchEvent(event);
        };
        const initialMainX = main.scrollX;
        pointer("pointerdown", 136, 485);
        pointer("pointermove", 196, 485);
        expect(mini.midPoint.x).toBeCloseTo(1040);
        expect(capture).toHaveBeenCalledWith(7);
        player.x += 100;
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        expect(mini.midPoint.x).toBeCloseTo(1040);
        pointer("pointerup", 196, 485);
        expect(element.dispatchEvent(new MouseEvent("click", { detail: 1, cancelable: true }))).toBe(false);
        expect(main.scrollX).toBe(initialMainX);
        manager.recenter();
        expect(mini.midPoint.x).toBeCloseTo(player.x);
        player.x += 50;
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        expect(mini.midPoint.x).toBeCloseTo(player.x);
        manager.destroy();
    });

    it("occludes names only inside the minimap and restores the HTML layer on close", () => {
        const { manager, scene } = setup(true);
        expect(scene.game.domContainer.style.clipPath).toContain("polygon(evenodd");
        expect(scene.game.domContainer.style.clipPath).toContain("16px 390px");
        manager.destroy();
        expect(scene.game.domContainer.style.clipPath).toBe("inset(0px)");
    });

    it("never renders HTML names through the minimap and restores their rendering on teardown", () => {
        const { manager, mini, main, events, avatar } = setup();
        const names = new Phaser.GameObjects.GameObject(avatar.scene, "DOMElement");
        const original = () => true;
        names.willRender = original;
        events.emit(Phaser.Scenes.Events.ADDED_TO_SCENE, names);
        expect(names.willRender(mini)).toBe(false);
        expect(names.willRender(main)).toBe(true);
        manager.destroy();
        expect(names.willRender(mini)).toBe(true);
    });

    it("walks to the chosen area rather than the group marker position", async () => {
        const { manager, moveTo } = setup();
        await manager.moveToArea("outside");
        expect(moveTo).toHaveBeenCalledWith({ x: 3925, y: 2925 }, true);
        moveTo.mockClear();
        await manager.moveToArea("deleted");
        expect(moveTo).not.toHaveBeenCalled();
        manager.destroy();
        await manager.moveToArea("meeting");
        expect(moveTo).not.toHaveBeenCalled();
    });

    it("zooms around the woka without changing the main camera and converts right clicks at the new scale", () => {
        const { manager, scene, mini, main, element, moveTo } = setup();
        const mainZoom = main.zoom;
        const initialWidth = mini.worldView.width;
        manager.setZoomLevel(2);
        expect(mini.worldView.width).toBeCloseTo(initialWidth / 2.25);
        expect(mini.midPoint.x).toBe(scene.CurrentPlayer.x);
        expect(main.zoom).toBe(mainZoom);
        element.dispatchEvent(new MouseEvent("contextmenu", { clientX: 196, clientY: 485 }));
        expect(moveTo).toHaveBeenCalledWith(
            { x: expect.closeTo(1200 + mini.worldView.width / 4), y: expect.closeTo(1000) },
            true,
        );
        manager.setZoomLevel(-8);
        expect(mini.worldView.width).toBeGreaterThanOrEqual(scene.Map.widthInPixels);
        manager.destroy();
    });

    it("limits zoom and recentres an enlarged overview on the player", () => {
        const { manager, mini, player, onUpdate } = setup(true);
        expect(onUpdate.mock.lastCall?.[0].canZoomOut).toBe(false);
        manager.setZoomLevel(1);
        // Near the edge, keep the viewport inside the map rather than showing empty space.
        expect(mini.worldView.contains(player.x, player.y)).toBe(true);
        expect(mini.worldView.x).toBeGreaterThanOrEqual(0);
        expect(onUpdate.mock.lastCall?.[0].canZoomOut).toBe(true);
        manager.setZoomLevel(100);
        expect(mini.midPoint.x).toBeCloseTo(player.x);
        expect(onUpdate.mock.lastCall?.[0].canZoomIn).toBe(false);
        manager.destroy();
    });

    it("smooths only the minimap pass and restores texture filtering before another camera", () => {
        const { manager, scene, mini, main } = setup();
        const gl = {
            LINEAR: 9729,
            NEAREST: 9728,
            TEXTURE_2D: 3553,
            TEXTURE_BINDING_2D: 32873,
            TEXTURE_MIN_FILTER: 10241,
            TEXTURE_MAG_FILTER: 10240,
            getParameter: vi.fn(() => "previous-binding"),
            bindTexture: vi.fn(),
            texParameteri: vi.fn(),
        };
        Object.assign(scene.game.renderer, { type: Phaser.WEBGL, gl });
        scene.Map.tilesets.push({
            image: {
                source: [
                    {
                        glTexture: {
                            webGLTexture: "map-texture",
                            minFilter: gl.NEAREST,
                            magFilter: gl.NEAREST,
                        },
                    },
                ],
            },
        } as unknown as Phaser.Tilemaps.Tileset);
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, main);
        expect(gl.texParameteri).not.toHaveBeenCalled();
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, mini);
        expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        expect(gl.bindTexture).toHaveBeenLastCalledWith(gl.TEXTURE_2D, "previous-binding");
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, main);
        expect(gl.texParameteri).toHaveBeenLastCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, mini);
        const source = scene.Map.tilesets[0].image?.source[0];
        if (!source?.glTexture) throw new Error("Missing map texture");
        Object.assign(gl, { LINEAR_MIPMAP_LINEAR: 9987 });
        Object.assign(source.glTexture, { isMipmap: () => true });
        scene.game.renderer.emit(Phaser.Renderer.Events.RENDER, scene, mini);
        expect(gl.texParameteri).toHaveBeenCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, 9987);
        manager.destroy();
        expect(gl.texParameteri).toHaveBeenLastCalledWith(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        expect(scene.game.renderer.listenerCount(Phaser.Renderer.Events.RENDER)).toBe(0);
    });

    it("projects named zone centres and excludes unnamed or offscreen zones", () => {
        const { manager, onUpdate } = setup();
        const areas = onUpdate.mock.lastCall?.[0].areas;
        expect(areas).toHaveLength(1);
        expect(areas[0]).toMatchObject({ id: "meeting", name: "Meeting room" });
        expect(areas[0].x).toBeCloseTo(50);
        expect(areas[0].y).toBeCloseTo(50);
        manager.destroy();
    });

    it("walks to the right-clicked world position and removes the handler on teardown", () => {
        const { manager, scene, element, moveTo } = setup();
        const click = () =>
            element.dispatchEvent(
                new MouseEvent("contextmenu", {
                    clientX: 136,
                    clientY: 485,
                    cancelable: true,
                    bubbles: true,
                }),
            );
        expect(click()).toBe(false);
        expect(moveTo).toHaveBeenCalledWith({ x: 1200, y: 1000 }, true);
        moveTo.mockClear();
        Object.defineProperty(scene.userInputManager, "isRightClickEnabled", { value: false });
        click();
        expect(moveTo).not.toHaveBeenCalled();
        manager.destroy();
        expect(click()).toBe(true);
    });

    it("does not walk when right-clicking the letterboxing", () => {
        const { manager, element, moveTo } = setup(true);
        element.dispatchEvent(new MouseEvent("contextmenu", { clientX: 136, clientY: 391 }));
        expect(moveTo).not.toHaveBeenCalled();
        manager.destroy();
    });

    it("follows the avatar in a separate camera without moving the main viewport", () => {
        const { manager, mini, main, marker, player, events, onUpdate } = setup();
        const originalMain = { x: main.worldView.x, y: main.worldView.y };
        expect(mini.inputEnabled).toBe(false);
        expect(mini.worldView.width).toBeCloseTo(640);
        expect(mini.midPoint.x).toBe(player.x);
        expect(marker.cameraFilter & main.id).toBe(main.id);
        expect(marker.cameraFilter & mini.id).toBe(0);
        expect(marker.x).toBe(player.x);
        expect(onUpdate.mock.lastCall?.[0].player.x).toBeCloseTo(50);
        expect(onUpdate.mock.lastCall?.[0].player.y).toBeCloseTo(50);
        expect(onUpdate.mock.lastCall?.[0].player.angle).toBe(90);
        player.x += 120;
        events.emit(Phaser.Scenes.Events.POST_UPDATE);
        expect(mini.midPoint.x).toBe(player.x);
        expect({ x: main.worldView.x, y: main.worldView.y }).toEqual(originalMain);
        manager.destroy();
    });

    it("keeps the full map inside the expanded view", () => {
        const { manager, mini } = setup(true);
        expect(mini.worldView.width).toBeGreaterThanOrEqual(4000);
        expect(mini.worldView.height).toBeGreaterThanOrEqual(3000);
        expect(mini.midPoint.x).toBeCloseTo(2000);
        expect(mini.midPoint.y).toBeCloseTo(1500);
        manager.destroy();
    });

    it("fills the compact radar on small maps instead of leaving most of it empty", () => {
        const { manager, scene, mini, player } = setup();
        scene.Map.widthInPixels = 992;
        scene.Map.heightInPixels = 544;
        player.x = 200;
        player.y = 200;
        scene.scale.emit(Phaser.Scale.Events.RESIZE);
        expect(mini.worldView.width).toBeLessThanOrEqual(992);
        expect(mini.worldView.height).toBeLessThanOrEqual(544);
        expect(mini.worldView.x).toBeGreaterThanOrEqual(0);
        expect(mini.worldView.y).toBeGreaterThanOrEqual(0);
        manager.destroy();
    });

    it("excludes existing and new avatars but preserves map layers and restores filters on teardown", () => {
        const { manager, mini, events, avatar, tiles, disconnect, removeCamera } = setup();
        expect(avatar.cameraFilter).toBe(4 | mini.id);
        expect(tiles.cameraFilter).toBe(mini.id);
        const newcomer = new Phaser.GameObjects.GameObject(avatar.scene, "Container");
        events.emit(Phaser.Scenes.Events.ADDED_TO_SCENE, newcomer);
        expect(newcomer.cameraFilter).toBe(mini.id);
        events.emit(Phaser.Scenes.Events.REMOVED_FROM_SCENE, newcomer);
        expect(newcomer.cameraFilter).toBe(0);
        manager.destroy();
        manager.destroy();
        expect(avatar.cameraFilter).toBe(4);
        expect(disconnect).toHaveBeenCalledTimes(1);
        expect(removeCamera).toHaveBeenCalledTimes(1);
        expect(events.listenerCount(Phaser.Scenes.Events.POST_UPDATE)).toBe(0);
        expect(events.listenerCount(Phaser.Scenes.Events.ADDED_TO_SCENE)).toBe(0);
    });
});
