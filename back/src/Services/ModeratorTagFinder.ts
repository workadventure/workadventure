import { JitsiRoomPropertyData, WAMFileFormat } from "@workadventure/map-editor";
import { slugifyJitsiRoomName } from "@workadventure/shared-utils/src/Jitsi/slugify";
import { ITiledMap, ITiledMapLayer, ITiledMapProperty, ITiledMapTileset } from "@workadventure/tiled-map-type-guard";

export class ModeratorTagFinder {
    /**
     * Variables mapping a room to a moderator tag
     */
    private _roomModerators = new Map<string, string>();

    constructor(
        private map: ITiledMap,
        private parseProperty: (properties: ITiledMapProperty[]) => { mainValue: string; tagValue: string } | undefined,
        private roomId?: string,
        private wamFileProperties?: WAMFileFormat
    ) {
        for (const layer of map.layers) {
            this.findModeratorTagInLayer(layer);
        }
        for (const tileset of map.tilesets) {
            this.findModeratorTagInTileset(tileset);
        }
        if (wamFileProperties != undefined && roomId != undefined) {
            this.findModeratorTagInWamFile();
        }
    }

    private findModeratorTagInLayer(layer: ITiledMapLayer) {
        if (layer.type === "objectgroup") {
            for (const object of layer.objects) {
                if (object.class === "area" || object.type === "area") {
                    this.registerProperties(object.properties ?? []);
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

    // Find moderator tag in the WAM file
    private findModeratorTagInWamFile(): void {
        if (!this.wamFileProperties) return;
        const jitsiRooms: JitsiRoomPropertyData[] = [];
        // Get Area properties with type "jitsiRoomProperty"
        for (const area of Object.values(this.wamFileProperties.areas)) {
            const property = area.properties?.find((prop) => prop.type === "jitsiRoomProperty") as
                | JitsiRoomPropertyData
                | undefined;
            if (property != undefined && property.jitsiRoomAdminTag != undefined) jitsiRooms.push(property);
        }
        // Get Entity properties with type "jitsiRoomProperty"
        for (const entity of Object.values(this.wamFileProperties.entities)) {
            const property = entity.properties?.find((prop) => prop.type === "jitsiRoomProperty") as
                | JitsiRoomPropertyData
                | undefined;
            if (property != undefined && property.jitsiRoomAdminTag != undefined) jitsiRooms.push(property);
        }
        // Register the properties
        for (const jitsiRoom of jitsiRooms) {
            const jitsiRoomId = slugifyJitsiRoomName(jitsiRoom.roomName, this.roomId as string, jitsiRoom.noPrefix);
            this._roomModerators.set(jitsiRoomId, jitsiRoom.jitsiRoomAdminTag as string);
        }
    }
}
