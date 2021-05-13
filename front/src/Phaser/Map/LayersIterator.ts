import type {ITiledMap, ITiledMapLayer} from "./ITiledMap";

/**
 * Iterates over the layers of a map, flattening the grouped layers
 */
export class LayersIterator implements IterableIterator<ITiledMapLayer> {

    private layers: ITiledMapLayer[] = [];
    private pointer: number = 0;

    constructor(private map: ITiledMap) {
        this.initLayersList(map.layers, '');
    }

    private initLayersList(layers : ITiledMapLayer[], prefix : string) {
        for (const layer of layers) {
            if (layer.type === 'group') {
                this.initLayersList(layer.layers, prefix + layer.name + '/');
            } else {
                const layerWithNewName = { ...layer };
                layerWithNewName.name = prefix+layerWithNewName.name;
                this.layers.push(layerWithNewName);
            }
        }
    }

    public next(): IteratorResult<ITiledMapLayer> {
        if (this.pointer < this.layers.length) {
            return {
                done: false,
                value: this.layers[this.pointer++]
            }
        } else {
            return {
                done: true,
                value: null
            }
        }
    }

    [Symbol.iterator](): IterableIterator<ITiledMapLayer> {
        return new LayersIterator(this.map);
    }
}
