import { describe, expect, it } from "vitest";
import { Subject } from "rxjs";
import { GameMapFrontWrapper } from "../../../../src/front/Phaser/Game/GameMap/GameMapFrontWrapper";

// A 2x1 map with one "collisions" tile layer: a colliding tile, then an empty tile.
function makeWrapper(visibleInTiled: boolean): GameMapFrontWrapper {
    const layer = {
        visible: visibleInTiled,
        layerIndex: 0,
        layer: {
            name: "collisions",
            properties: [],
            data: [
                [
                    { index: 1, properties: { collides: true } },
                    { index: -1, properties: {} },
                ],
            ],
        },
        setVisible(visible: boolean) {
            this.visible = visible;
            return this;
        },
        setCollisionByProperty() {
            return this;
        },
    };
    // Skip the Phaser-heavy constructor: set only what the collision grid reads.
    return Object.assign(Object.create(GameMapFrontWrapper.prototype) as GameMapFrontWrapper, {
        gameMap: { getMap: () => ({ width: 2, height: 1 }), getWamFile: () => undefined },
        phaserLayers: [layer],
        perLayerCollisionGridCache: new Map(),
        dirtyLayerIndices: new Set(),
        scriptHiddenLayers: new Set(),
        collisionGridDirty: true,
        areasCollisionLayerDirty: false,
        mapChangedSubject: new Subject(),
    });
}

describe("collision grid of hidden layers", () => {
    it("keeps the collisions of a layer hidden in Tiled, like the keyboard colliders", () => {
        expect(makeWrapper(false).getCollisionGrid()).toEqual([[1, 0]]);
    });

    it("drops the collisions of a layer hidden with WA.room.hideLayer until it is shown again", () => {
        const wrapper = makeWrapper(true);
        wrapper.setLayerVisibility("collisions", false);
        expect(wrapper.getCollisionGrid()).toEqual([[0, 0]]);
        wrapper.setLayerVisibility("collisions", true);
        expect(wrapper.getCollisionGrid()).toEqual([[1, 0]]);
    });
});
