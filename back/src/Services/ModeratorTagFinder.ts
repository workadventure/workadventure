import { ITiledMap, ITiledMapLayer, ITiledMapProperty } from "@workadventure/tiled-map-type-guard";

export class ModeratorTagFinder {
    /**
     * Variables mapping a room to a moderator tag
     */
    private _roomModerators = new Map<string, string>();

    constructor(private map: ITiledMap, mainProperty: string, tagProperty: string) {
        for (const layer of map.layers) {
            this.findModeratorTagInLayer(layer, mainProperty, tagProperty);
        }
    }

    private findModeratorTagInLayer(layer: ITiledMapLayer, mainProperty: string, tagProperty: string) {
        if (layer.type === "objectgroup") {
            for (const object of layer.objects) {
                if (object.class === "area" || object.type === "area") {
                    this.registerProperties(layer.properties ?? [], mainProperty, tagProperty);
                }
            }
        } else if (layer.type === "tilelayer") {
            this.registerProperties(layer.properties ?? [], mainProperty, tagProperty);
        } else if (layer.type === "group") {
            for (const innerLayer of layer.layers) {
                this.findModeratorTagInLayer(innerLayer, mainProperty, tagProperty);
            }
        }
    }

    private registerProperties(properties: ITiledMapProperty[], mainProperty: string, tagProperty: string): void {
        let mainValue: string | undefined = undefined;
        let tagValue: string | undefined = undefined;
        for (const property of properties ?? []) {
            if (property.name === mainProperty && typeof property.value === "string") {
                mainValue = property.value;
            } else if (property.name === tagProperty && typeof property.value === "string") {
                tagValue = property.value;
            }
        }
        if (mainValue !== undefined && tagValue !== undefined) {
            this._roomModerators.set(mainValue, tagValue);
        }
    }

    public getModeratorTag(roomName: string): string | undefined {
        return this._roomModerators.get(roomName);
    }
}
