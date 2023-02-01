import { ITiledMap, ITiledMapLayer, ITiledMapProperty, ITiledMapTileset } from "@workadventure/tiled-map-type-guard";

export class ModeratorTagFinder {
    /**
     * Variables mapping a room to a moderator tag
     */
    private _roomModerators = new Map<string, string>();

    constructor(
        private map: ITiledMap,
        private parseProperty: (properties: ITiledMapProperty[]) => { mainValue: string; tagValue: string } | undefined
    ) {
        for (const layer of map.layers) {
            this.findModeratorTagInLayer(layer);
        }
        for (const tileset of map.tilesets) {
            this.findModeratorTagInTileset(tileset);
        }
    }

    private findModeratorTagInLayer(layer: ITiledMapLayer) {
        if (layer.type === "objectgroup") {
            for (const object of layer.objects) {
                if (object.class === "area" || object.type === "area") {
                    this.registerProperties(layer.properties ?? []);
                }
            }
        } else if (layer.type === "tilelayer") {
            this.registerProperties(layer.properties ?? []);
        } else if (layer.type === "group") {
            for (const innerLayer of layer.layers) {
                this.findModeratorTagInLayer(innerLayer);
            }
        }
    }

    private registerProperties(properties: ITiledMapProperty[]): void {
        const result = this.parseProperty(properties);
        if (result === undefined) {
            return;
        }
        this._roomModerators.set(result.mainValue, result.tagValue);
    }

    public getModeratorTag(roomName: string): string | undefined {
        return this._roomModerators.get(roomName);
    }

    private findModeratorTagInTileset(tileset: ITiledMapTileset) {
        if ("tiles" in tileset && tileset.tiles) {
            for (const tile of tileset.tiles) {
                if (tile.properties) {
                    this.registerProperties(tile.properties);
                }
            }
        }
    }
}
