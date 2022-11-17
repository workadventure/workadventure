import { flattenGroupLayersMap } from "@workadventure/map-editor";
import type { ITiledMapLayer } from "@workadventure/tiled-map-type-guard";
import { describe, expect, it } from "vitest";

describe("Layers flattener", () => {
    it("should iterate maps with no group", () => {
        let flatLayers: ITiledMapLayer[] = [];
        flatLayers = flattenGroupLayersMap({
            compressionlevel: -1,
            height: 2,
            infinite: false,
            layers: [
                {
                    data: [0, 0, 0, 0],
                    height: 2,
                    id: 1,
                    name: "Tile Layer 1",
                    opacity: 1,
                    type: "tilelayer",
                    visible: true,
                    width: 2,
                    x: 0,
                    y: 0,
                },
                {
                    data: [0, 0, 0, 0],
                    height: 2,
                    id: 1,
                    name: "Tile Layer 2",
                    opacity: 1,
                    type: "tilelayer",
                    visible: true,
                    width: 2,
                    x: 0,
                    y: 0,
                },
            ],
            nextlayerid: 2,
            nextobjectid: 1,
            orientation: "orthogonal",
            renderorder: "right-down",
            tiledversion: "2021.03.23",
            tileheight: 32,
            tilesets: [],
            tilewidth: 32,
            type: "map",
            version: 1.5,
            width: 2,
        });

        const layers = [];
        for (const layer of flatLayers) {
            layers.push(layer.name);
        }
        expect(layers).toEqual(["Tile Layer 1", "Tile Layer 2"]);
    });

    it("should iterate maps with recursive groups", () => {
        let flatLayers: ITiledMapLayer[] = [];
        flatLayers = flattenGroupLayersMap({
            compressionlevel: -1,
            height: 2,
            infinite: false,
            layers: [
                {
                    id: 6,
                    layers: [
                        {
                            id: 5,
                            layers: [
                                {
                                    data: [0, 0, 0, 0],
                                    height: 2,
                                    id: 10,
                                    name: "Tile3",
                                    opacity: 1,
                                    type: "tilelayer",
                                    visible: true,
                                    width: 2,
                                    x: 0,
                                    y: 0,
                                },
                                {
                                    data: [0, 0, 0, 0],
                                    height: 2,
                                    id: 9,
                                    name: "Tile2",
                                    opacity: 1,
                                    type: "tilelayer",
                                    visible: true,
                                    width: 2,
                                    x: 0,
                                    y: 0,
                                },
                            ],
                            name: "Group 3",
                            opacity: 1,
                            type: "group",
                            visible: true,
                            x: 0,
                            y: 0,
                        },
                        {
                            id: 7,
                            layers: [
                                {
                                    data: [0, 0, 0, 0],
                                    height: 2,
                                    id: 8,
                                    name: "Tile1",
                                    opacity: 1,
                                    type: "tilelayer",
                                    visible: true,
                                    width: 2,
                                    x: 0,
                                    y: 0,
                                },
                            ],
                            name: "Group 2",
                            opacity: 1,
                            type: "group",
                            visible: true,
                            x: 0,
                            y: 0,
                        },
                    ],
                    name: "Group 1",
                    opacity: 1,
                    type: "group",
                    visible: true,
                    x: 0,
                    y: 0,
                },
            ],
            nextlayerid: 11,
            nextobjectid: 1,
            orientation: "orthogonal",
            renderorder: "right-down",
            tiledversion: "2021.03.23",
            tileheight: 32,
            tilesets: [],
            tilewidth: 32,
            type: "map",
            version: 1.5,
            width: 2,
        });

        const layers = [];
        for (const layer of flatLayers) {
            layers.push(layer.name);
        }
        expect(layers).toEqual(["Group 1/Group 3/Tile3", "Group 1/Group 3/Tile2", "Group 1/Group 2/Tile1"]);
    });
});
