import * as Phaser from "phaser";
import { PositionMessage_Direction } from "@workadventure/messages";
import type { Subscription } from "rxjs";
import { Entity, EntityEvent } from "../ECS/Entity";
import { waScaleManager } from "../Services/WaScaleManager";
import type { GameScene } from "./GameScene";
import { getMinimapViewport, projectOnMinimap, getMinimapDomClipPath } from "./MinimapGeometry";

export interface MinimapState {
    canZoomIn: boolean;
    canZoomOut: boolean;
    areas: { id: string; name: string; x: number; y: number }[];
    player: { x: number; y: number; angle: number };
    viewport: { x: number; y: number; width: number; height: number };
}

/** A second view of the existing map. It never changes the main camera or the server viewport. */
export class MinimapManager {
    private readonly camera: Phaser.Cameras.Scene2D.Camera;
    private readonly mask: Phaser.GameObjects.Graphics;
    private background?: Phaser.GameObjects.RenderTexture;
    private backgroundDirty = true;
    private backgroundSignature = "";
    private readonly mapChanges?: Subscription;
    private readonly observedEntities = new Set<Entity>();
    private readonly marker: Phaser.GameObjects.Container;
    private readonly markerSprites = new Map<string, Phaser.GameObjects.Sprite>();
    private lastMarkerFrames = "";
    private readonly animationTimes = new Map<Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer, number>();
    private readonly smoothedTextures = new Set<Phaser.Renderer.WebGL.Wrappers.WebGLTextureWrapper>();
    private readonly filteredObjects = new Set<Phaser.GameObjects.GameObject>();
    private readonly resizeObserver: ResizeObserver;
    private readonly releaseFullResolution: () => void;
    private readonly domRenderChecks = new Map<
        Phaser.GameObjects.GameObject,
        Phaser.GameObjects.GameObject["willRender"]
    >();
    private readonly previousDomClipPath: string;
    private lastState = "";
    private zoomLevel = 0;
    private minimumZoom = 0;
    private destroyed = false;
    private manualCenter?: { x: number; y: number };
    private drag?: { id: number; x: number; y: number; scrollX: number; scrollY: number; moved: boolean };
    private suppressClick = false;
    private followPlayer = false;

    constructor(
        private readonly scene: GameScene,
        private readonly element: HTMLElement,
        private readonly overview: boolean,
        private readonly onUpdate: (state: MinimapState) => void,
    ) {
        this.previousDomClipPath = scene.game.domContainer?.style.clipPath ?? "";
        this.camera = scene.cameras.add(0, 0, 1, 1, false, "minimap");
        this.camera.inputEnabled = false;
        this.camera.setBackgroundColor("#18232b");
        scene.game.renderer.on(Phaser.Renderer.Events.RENDER, this.smoothMinimap);
        scene.game.renderer.on(Phaser.Renderer.Events.POST_RENDER, this.restoreTextureFilters);
        this.marker = scene.add.container(0, 0).setDepth(Number.MAX_SAFE_INTEGER);
        this.marker.cameraFilter |= scene.cameras.main.id;
        this.mask = scene.make.graphics({}, false);
        if (scene.game.renderer.type === Phaser.WEBGL) {
            this.camera.filters.external.addMask(this.mask, false, scene.cameras.default);
        } else {
            this.camera.setMask(this.mask.createGeometryMask(), true);
        }
        scene.children.getChildren().forEach(this.filterObject);
        scene.events.on(Phaser.Scenes.Events.ADDED_TO_SCENE, this.filterObject);
        scene.events.on(Phaser.Scenes.Events.REMOVED_FROM_SCENE, this.restoreObject);
        scene.events.on(Phaser.Scenes.Events.POST_UPDATE, this.update);
        scene.events.once(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
        scene.scale.on(Phaser.Scale.Events.RESIZE, this.resize);
        this.resizeObserver = new ResizeObserver(this.resize);
        this.resizeObserver.observe(element);
        this.resizeObserver.observe(scene.game.canvas);
        this.releaseFullResolution = waScaleManager.requireFullResolution(scene.cameras.main);
        this.element.addEventListener("contextmenu", this.handleContextMenu);
        this.element.addEventListener("pointerdown", this.handlePointerDown);
        this.element.addEventListener("pointermove", this.handlePointerMove);
        this.element.addEventListener("pointerup", this.handlePointerEnd);
        this.element.addEventListener("pointercancel", this.handlePointerEnd);
        this.element.addEventListener("lostpointercapture", this.handlePointerEnd);
        this.element.addEventListener("click", this.handleClick, true);
        this.mapChanges = scene
            .getGameMapFrontWrapper()
            .getMapChangedObservable?.()
            .subscribe(() => this.invalidateBackground());
        this.resize();
    }

    private readonly invalidateBackground = (): void => {
        this.backgroundDirty = true;
        this.scene.markDirty();
    };

    private isBackgroundObject(
        object: Phaser.GameObjects.GameObject,
    ): object is Entity | Phaser.Tilemaps.TilemapLayer | Phaser.Tilemaps.TilemapGPULayer {
        return object.type === "TilemapLayer" || object.type === "TilemapGPULayer" || object instanceof Entity;
    }

    private updateBackground(): void {
        const objects = this.scene.children
            .getChildren()
            .filter((object) => this.isBackgroundObject(object))
            .sort((a, b) => a.depth - b.depth);
        const signature = objects
            .map((object) => {
                const image = object as Entity;
                return `${image.renderFlags}:${image.visible}:${image.alpha}:${image.x}:${image.y}:${image.scaleX}:${image.scaleY}:${image.depth}:${image.rotation}:${image.flipX}:${image.flipY}:${image.texture?.key}:${image.frame?.name}`;
            })
            .join(";");
        if (!this.backgroundDirty && signature === this.backgroundSignature) return;
        this.backgroundSignature = signature;
        this.backgroundDirty = false;
        if (!this.background) {
            const renderer = this.scene.game.renderer;
            const limit =
                renderer.type === Phaser.WEBGL
                    ? Math.min(
                          4096,
                          (renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl.getParameter(
                              (renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl.MAX_TEXTURE_SIZE,
                          ) as number,
                      )
                    : 4096;
            const scale = Math.min(1, limit / this.scene.Map.widthInPixels, limit / this.scene.Map.heightInPixels);
            const width = Math.ceil(this.scene.Map.widthInPixels * scale);
            const height = Math.ceil(this.scene.Map.heightInPixels * scale);
            this.background = this.scene.make.renderTexture({ x: 0, y: 0, width, height }, false);
            this.background.setOrigin(0).setDisplaySize(this.scene.Map.widthInPixels, this.scene.Map.heightInPixels);
            this.background.cameraFilter = this.scene.cameras.main.id;
            this.background.camera
                .setZoom(scale)
                .centerOn(this.scene.Map.widthInPixels / 2, this.scene.Map.heightInPixels / 2);
            this.scene.add.existing(this.background);
        }
        // Render static scenery once, with the same frozen frames and sampling as the live minimap.
        this.smoothMinimap(this.scene, this.camera);
        try {
            this.background
                .clear()
                .draw(objects.filter((object) => object.renderFlags === Phaser.GameObjects.GameObject.RENDER_MASK))
                .render();
        } finally {
            this.restoreTextureFilters();
        }
    }

    public recenter(): void {
        this.manualCenter = undefined;
        this.followPlayer = true;
        this.update();
        this.scene.markDirty();
    }

    private readonly handlePointerDown = (event: PointerEvent): void => {
        if (event.button !== 0 || this.drag || this.destroyed) return;
        this.suppressClick = false;
        this.drag = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            scrollX: this.camera.scrollX,
            scrollY: this.camera.scrollY,
            moved: false,
        };
        this.element.setPointerCapture(event.pointerId);
    };

    private readonly handlePointerMove = (event: PointerEvent): void => {
        const drag = this.drag;
        if (!drag || drag.id !== event.pointerId) return;
        const dx = event.clientX - drag.x;
        const dy = event.clientY - drag.y;
        if (!drag.moved && Math.hypot(dx, dy) < 6) return;
        drag.moved = true;
        const rect = this.element.getBoundingClientRect();
        this.camera.setScroll(
            drag.scrollX - (dx * this.camera.displayWidth) / rect.width,
            drag.scrollY - (dy * this.camera.displayHeight) / rect.height,
        );
        this.camera.preRender();
        this.manualCenter = { x: this.camera.midPoint.x, y: this.camera.midPoint.y };
        this.update();
        this.scene.markDirty();
    };

    private readonly handlePointerEnd = (event: PointerEvent): void => {
        if (this.drag?.id !== event.pointerId) return;
        this.suppressClick = this.drag.moved;
        this.drag = undefined;
        if (this.element.hasPointerCapture(event.pointerId)) this.element.releasePointerCapture(event.pointerId);
    };

    private readonly handleClick = (event: MouseEvent): void => {
        if (!this.suppressClick || event.detail === 0) return;
        event.preventDefault();
        event.stopImmediatePropagation();
        this.suppressClick = false;
    };

    public readonly handleContextMenu = (event: MouseEvent): void => {
        event.preventDefault();
        event.stopPropagation();
        if (this.destroyed || !this.camera.visible || !this.scene.userInputManager.isRightClickEnabled) {
            return;
        }
        const rect = this.element.getBoundingClientRect();
        const view = this.camera.worldView;
        const x = view.x + ((event.clientX - rect.x) / rect.width) * view.width;
        const y = view.y + ((event.clientY - rect.y) / rect.height) * view.height;
        // Ignore the letterboxing around the map in overview mode.
        if (x < 0 || y < 0 || x >= this.scene.Map.widthInPixels || y >= this.scene.Map.heightInPixels) {
            return;
        }
        this.scene.getCameraManager().resumePlayerFollow();
        this.scene.moveTo({ x, y }, true).catch((reason) => console.warn(reason));
    };

    public async moveToArea(id: string): Promise<void> {
        if (this.destroyed || !this.scene.userInputManager.isRightClickEnabled) return;
        const area = this.scene.getGameMapFrontWrapper().getAreas()?.get(id);
        if (!area) return;
        this.scene.getCameraManager().resumePlayerFollow();
        await this.scene.moveTo({ x: area.x + area.width / 2, y: area.y + area.height / 2 }, true);
    }

    /** Linear sampling only during this camera's pass; preserve the main game's pixel rendering. */
    private readonly smoothMinimap = (scene: Phaser.Scene, camera: Phaser.Cameras.Scene2D.Camera): void => {
        this.restoreTextureFilters();
        if (scene !== this.scene || camera !== this.camera) return;
        // The layers are shared with the main camera. Freeze only this render pass.
        for (const object of this.scene.children.getChildren()) {
            if (object instanceof Phaser.Tilemaps.TilemapLayer || object instanceof Phaser.Tilemaps.TilemapGPULayer) {
                this.animationTimes.set(object, object.timeElapsed);
                object.timeElapsed = 0;
            }
        }
        if (this.scene.game.renderer.type !== Phaser.WEBGL) return;
        const sources = new Set<Phaser.Textures.TextureSource>();
        for (const tileset of this.scene.Map.tilesets) {
            for (const source of tileset.image?.source ?? []) sources.add(source);
        }
        for (const object of this.scene.children.getChildren()) {
            if (object instanceof Entity) {
                for (const source of object.texture.source) sources.add(source);
            }
        }
        for (const source of this.background?.texture.source ?? []) sources.add(source);
        for (const sprite of this.markerSprites.values()) {
            for (const source of sprite.texture.source) sources.add(source);
        }
        const gl = (this.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
        const binding = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
        for (const source of sources) {
            const texture = source.glTexture;
            if (!texture?.webGLTexture) continue;
            this.smoothedTextures.add(texture);
            gl.bindTexture(gl.TEXTURE_2D, texture.webGLTexture);
            // Preserve pre-existing mipmap levels, but do not generate new ones for tile
            // atlases: averaging neighbouring tiles introduces colour bleeding and blur.
            const minFilter = texture.isMipmap?.() ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR;
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        }
        gl.bindTexture(gl.TEXTURE_2D, binding);
    };

    private readonly restoreTextureFilters = (): void => {
        for (const [layer, time] of this.animationTimes) layer.timeElapsed = time;
        this.animationTimes.clear();
        if (!this.smoothedTextures.size) return;
        const gl = (this.scene.game.renderer as Phaser.Renderer.WebGL.WebGLRenderer).gl;
        const binding = gl.getParameter(gl.TEXTURE_BINDING_2D) as WebGLTexture | null;
        for (const texture of this.smoothedTextures) {
            if (!texture.webGLTexture) continue;
            gl.bindTexture(gl.TEXTURE_2D, texture.webGLTexture);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, texture.minFilter);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, texture.magFilter);
        }
        gl.bindTexture(gl.TEXTURE_2D, binding);
        this.smoothedTextures.clear();
    };

    private readonly filterObject = (object: Phaser.GameObjects.GameObject): void => {
        if (object === this.marker || object === this.background) return;
        if (this.isBackgroundObject(object)) this.invalidateBackground();
        if (object instanceof Entity && !this.observedEntities.has(object)) {
            this.observedEntities.add(object);
            object.on(EntityEvent.Moved, this.invalidateBackground);
            object.on(EntityEvent.Updated, this.invalidateBackground);
        }
        // DOMElement.willRender always returns true: its renderer hides the shared HTML node
        // when filtered by a camera. Skip this camera entirely instead of hiding the main view.
        if (object.type === "DOMElement" && !this.domRenderChecks.has(object)) {
            // eslint-disable-next-line @typescript-eslint/unbound-method -- Called with the original object below and restored on teardown.
            const original = object.willRender;
            this.domRenderChecks.set(object, original);
            object.willRender = (camera) => camera !== this.camera && original.call(object, camera);
        }
        object.cameraFilter |= this.camera.id;
        this.filteredObjects.add(object);
    };

    private readonly restoreObject = (object: Phaser.GameObjects.GameObject): void => {
        if (this.isBackgroundObject(object)) this.invalidateBackground();
        if (object instanceof Entity && this.observedEntities.delete(object)) {
            object.off(EntityEvent.Moved, this.invalidateBackground);
            object.off(EntityEvent.Updated, this.invalidateBackground);
        }
        object.cameraFilter &= ~this.camera.id;
        const original = this.domRenderChecks.get(object);
        if (original) {
            object.willRender = original;
            this.domRenderChecks.delete(object);
        }
        this.filteredObjects.delete(object);
    };

    public setZoomLevel(level: number): void {
        const next = Phaser.Math.Clamp(Math.round(level), -8, 4);
        if (next === this.zoomLevel || this.destroyed) return;
        this.zoomLevel = next;
        this.resize();
    }

    private readonly resize = (): void => {
        if (this.destroyed) {
            return;
        }
        const dom = this.scene.game.domContainer;
        if (dom) {
            dom.style.clipPath =
                getMinimapDomClipPath(this.element.getBoundingClientRect(), dom.getBoundingClientRect(), {
                    width: dom.clientWidth,
                    height: dom.clientHeight,
                }) ?? this.previousDomClipPath;
        }
        const canvas = this.scene.game.canvas.getBoundingClientRect();
        const viewport = getMinimapViewport(this.element.getBoundingClientRect(), canvas, this.scene.scale.gameSize);
        if (!viewport) {
            this.camera.setVisible(false);
            return;
        }
        this.camera.setVisible(true);
        this.camera.setViewport(viewport.x, viewport.y, viewport.width, viewport.height);
        const zoom = this.overview
            ? Math.min(viewport.width / this.scene.Map.widthInPixels, viewport.height / this.scene.Map.heightInPixels)
            : Math.max(
                  viewport.width / 640,
                  viewport.width / this.scene.Map.widthInPixels,
                  viewport.height / this.scene.Map.heightInPixels,
              );
        this.minimumZoom = Math.min(
            viewport.width / this.scene.Map.widthInPixels,
            viewport.height / this.scene.Map.heightInPixels,
        );
        this.camera.setZoom(Math.max(this.minimumZoom, zoom * 1.5 ** this.zoomLevel));
        // Centre letterboxing when the map is smaller than the view on either axis.
        const width = Math.max(this.scene.Map.widthInPixels, this.camera.displayWidth);
        const height = Math.max(this.scene.Map.heightInPixels, this.camera.displayHeight);
        this.camera.setBounds(
            (this.scene.Map.widthInPixels - width) / 2,
            (this.scene.Map.heightInPixels - height) / 2,
            width,
            height,
        );
        this.mask
            .clear()
            .fillStyle(0xffffff)
            .fillRoundedRect(
                viewport.x,
                viewport.y,
                viewport.width,
                viewport.height,
                18 * (viewport.width / this.element.clientWidth),
            );
        this.update();
        this.scene.markDirty();
    };

    private readonly update = (): void => {
        if (this.destroyed) {
            return;
        }
        const player = this.scene.CurrentPlayer;
        if (!player || !this.camera.visible) {
            return;
        }
        this.updateBackground();
        this.camera.centerOn(
            this.manualCenter?.x ??
                (this.overview && !this.followPlayer && this.zoomLevel <= 0
                    ? this.scene.Map.widthInPixels / 2
                    : player.x),
            this.manualCenter?.y ??
                (this.overview && !this.followPlayer && this.zoomLevel <= 0
                    ? this.scene.Map.heightInPixels / 2
                    : player.y),
        );
        this.camera.preRender();
        this.updateMarker();
        const point = projectOnMinimap(player, this.camera.worldView);
        const mainView = this.scene.cameras.main.worldView;
        const viewport = projectOnMinimap(mainView, this.camera.worldView);
        const direction = player.lastDirection;
        const angle =
            direction === PositionMessage_Direction.RIGHT
                ? 90
                : direction === PositionMessage_Direction.DOWN
                  ? 180
                  : direction === PositionMessage_Direction.LEFT
                    ? 270
                    : 0;
        const state: MinimapState = {
            canZoomIn: this.zoomLevel < 4,
            canZoomOut: this.zoomLevel > -8 && this.camera.zoom > this.minimumZoom + 0.000001,
            areas: Array.from(this.scene.getGameMapFrontWrapper().getAreas()?.values() ?? [])
                .filter((area) => area.name.trim().length > 0)
                .map((area) => ({
                    id: area.id,
                    name: area.name,
                    ...projectOnMinimap(
                        { x: area.x + area.width / 2, y: area.y + area.height / 2 },
                        this.camera.worldView,
                    ),
                }))
                .filter((area) => area.x >= 0 && area.x <= 100 && area.y >= 0 && area.y <= 100),
            player: { ...point, angle },
            viewport: {
                ...viewport,
                width: (mainView.width / this.camera.worldView.width) * 100,
                height: (mainView.height / this.camera.worldView.height) * 100,
            },
        };
        const key = JSON.stringify(state);
        if (key !== this.lastState) {
            this.lastState = key;
            this.onUpdate(state);
            this.scene.markDirty();
        }
    };

    private updateMarker(): void {
        const player = this.scene.CurrentPlayer;
        for (const [key, source] of player.sprites) {
            const frame = source.anims.currentAnim?.frames[0]?.frame.name ?? source.frame.name;
            let sprite = this.markerSprites.get(key);
            if (!sprite) {
                sprite = new Phaser.GameObjects.Sprite(this.scene, 0, 0, source.texture.key, frame);
                this.marker.add(sprite);
                this.markerSprites.set(key, sprite);
            }
            sprite
                .setTexture(source.texture.key, frame)
                .setOrigin(source.originX, source.originY)
                .setScale(source.scaleX, source.scaleY)
                .setFlip(source.flipX, source.flipY)
                .setAlpha(source.alpha)
                .setVisible(source.visible);
        }
        for (const [key, sprite] of this.markerSprites) {
            if (!player.sprites.has(key)) {
                sprite.destroy();
                this.markerSprites.delete(key);
            }
        }
        this.marker.setPosition(player.x, player.y);
        const height = Math.max(1, ...Array.from(player.sprites.values(), (sprite) => sprite.displayHeight));
        const cssScale = this.element.clientWidth / this.camera.width;
        this.marker.setScale(28 / (height * this.camera.zoom * cssScale));
        const frames = Array.from(
            this.markerSprites.values(),
            (sprite) => `${sprite.texture.key}:${sprite.frame.name}`,
        ).join(",");
        if (frames !== this.lastMarkerFrames) {
            this.lastMarkerFrames = frames;
            this.scene.markDirty();
        }
    }

    public readonly destroy = (): void => {
        if (this.destroyed) {
            return;
        }
        this.destroyed = true;
        if (this.scene.game.domContainer) {
            this.scene.game.domContainer.style.clipPath = this.previousDomClipPath;
        }
        this.element.removeEventListener("contextmenu", this.handleContextMenu);
        if (this.drag && this.element.hasPointerCapture(this.drag.id)) this.element.releasePointerCapture(this.drag.id);
        this.drag = undefined;
        this.element.removeEventListener("pointerdown", this.handlePointerDown);
        this.element.removeEventListener("pointermove", this.handlePointerMove);
        this.element.removeEventListener("pointerup", this.handlePointerEnd);
        this.element.removeEventListener("pointercancel", this.handlePointerEnd);
        this.element.removeEventListener("lostpointercapture", this.handlePointerEnd);
        this.element.removeEventListener("click", this.handleClick, true);
        this.resizeObserver.disconnect();
        this.mapChanges?.unsubscribe();
        this.restoreTextureFilters();
        this.scene.game.renderer.off(Phaser.Renderer.Events.RENDER, this.smoothMinimap);
        this.scene.game.renderer.off(Phaser.Renderer.Events.POST_RENDER, this.restoreTextureFilters);
        this.scene.events.off(Phaser.Scenes.Events.ADDED_TO_SCENE, this.filterObject);
        this.scene.events.off(Phaser.Scenes.Events.REMOVED_FROM_SCENE, this.restoreObject);
        this.scene.events.off(Phaser.Scenes.Events.POST_UPDATE, this.update);
        this.scene.events.off(Phaser.Scenes.Events.SHUTDOWN, this.destroy);
        this.scene.scale.off(Phaser.Scale.Events.RESIZE, this.resize);
        for (const object of this.filteredObjects) {
            this.restoreObject(object);
        }
        this.filteredObjects.clear();
        this.background?.destroy();
        this.marker.destroy();
        this.markerSprites.clear();
        this.scene.cameras.remove(this.camera, true);
        this.mask.destroy();
        this.releaseFullResolution();
        this.scene.markDirty();
    };
}
