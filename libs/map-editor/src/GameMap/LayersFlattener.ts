import type { ITiledMap, ITiledMapLayer } from "@workadventure/tiled-map-type-guard";

/**
 * Flatten the grouped layers
 */
export function flattenGroupLayersMap(map: ITiledMap) {
    const flatLayers: ITiledMapLayer[] = [];
    flattenGroupLayers(map.layers, "", flatLayers);
    return flatLayers;
}

function flattenGroupLayers(layers: ITiledMapLayer[], prefix: string, flatLayers: ITiledMapLayer[]) {
    for (const layer of layers.map((layer) => ({ ...layer }))) {
        if (layer.type === "group") {
            flattenGroupLayers(layer.layers, prefix + layer.name + "/", flatLayers);
        } else {
            layer.name = prefix + layer.name;
            flatLayers.push(layer);
        }
    }
}
