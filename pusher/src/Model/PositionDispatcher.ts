/**
 * Tracks the position of every player on the map, and sends notifications to the players interested in knowing about the move
 * (i.e. players that are looking at the zone the player is currently in)
 *
 * Internally, the PositionNotifier works with Zones. A zone is a square area of a map.
 * Each player is in a given zone, and each player tracks one or many zones (depending on the player viewport)
 *
 * The PositionNotifier is important for performance. It allows us to send the position of players only to a restricted
 * number of players around the current player.
 */
import { Zone, ZoneEventListener } from "./Zone";
import { ViewportInterface } from "_Model/Websocket/ViewportMessage";
import { ExSocketInterface } from "_Model/Websocket/ExSocketInterface";
//import Debug from "debug";

//const debug = Debug('positiondispatcher');

interface ZoneDescriptor {
    i: number;
    j: number;
}

export class PositionDispatcher {
    // TODO: we need a way to clean the zones if no one is in the zone and no one listening (to free memory!)

    private zones: Zone[][] = [];

    constructor(
        public readonly roomId: string,
        private zoneWidth: number,
        private zoneHeight: number,
        private socketListener: ZoneEventListener
    ) {}

    private getZoneDescriptorFromCoordinates(x: number, y: number): ZoneDescriptor {
        return {
            i: Math.floor(x / this.zoneWidth),
            j: Math.floor(y / this.zoneHeight),
        };
    }

    /**
     * Sets the viewport coordinates.
     */
    public setViewport(socket: ExSocketInterface, viewport: ViewportInterface): void {
        if (viewport.left > viewport.right || viewport.top > viewport.bottom) {
            console.warn("Invalid viewport received: ", viewport);
            return;
        }

        const oldZones = socket.listenedZones;
        const newZones = new Set<Zone>();

        const topLeftDesc = this.getZoneDescriptorFromCoordinates(viewport.left, viewport.top);
        const bottomRightDesc = this.getZoneDescriptorFromCoordinates(viewport.right, viewport.bottom);

        for (let j = topLeftDesc.j; j <= bottomRightDesc.j; j++) {
            for (let i = topLeftDesc.i; i <= bottomRightDesc.i; i++) {
                newZones.add(this.getZone(i, j));
            }
        }

        const addedZones = [...newZones].filter((x) => !oldZones.has(x));
        const removedZones = [...oldZones].filter((x) => !newZones.has(x));

        for (const zone of addedZones) {
            zone.startListening(socket);
        }
        for (const zone of removedZones) {
            this.stopListening(zone, socket);
        }
    }

    private stopListening(zone: Zone, socket: ExSocketInterface): void {
        zone.stopListening(socket);
        if (!zone.hasListeners()) {
            zone.close();
            this.deleteZone(zone);
        }
    }

    /**
     * Removes the zone from the dispatcher.
     * Warning, zone is not closed by this method.
     */
    private deleteZone(zone: Zone): void {
        delete this.zones[zone.y][zone.x];
        if (Object.keys(this.zones[zone.y]).length === 0) {
            delete this.zones[zone.y];
        }
    }

    public removeViewport(socket: ExSocketInterface): void {
        // Also, let's stop listening on viewports
        for (const zone of socket.listenedZones) {
            this.stopListening(zone, socket);
        }
    }

    public isEmpty(): boolean {
        return Object.keys(this.zones).length === 0;
    }

    private getZone(i: number, j: number): Zone {
        let zoneRow = this.zones[j];
        if (zoneRow === undefined) {
            zoneRow = new Array<Zone>();
            this.zones[j] = zoneRow;
        }

        let zone = this.zones[j][i];
        if (zone === undefined) {
            zone = new Zone(this, this.socketListener, i, j, (e, myZone) => {
                // On failure, we delete the zone from the dispatcher so it can be recreated later.
                this.deleteZone(myZone);
                // TODO: we should check if the position dispatcher is still containing a room and propagate the onFailure to the parent if it is empty.
            });
            zone.init();
            this.zones[j][i] = zone;
        }
        return zone;
    }
}
