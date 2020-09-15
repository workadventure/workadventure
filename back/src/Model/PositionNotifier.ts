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
import {UserEntersCallback, UserLeavesCallback, UserMovesCallback, Zone} from "./Zone";
import {PointInterface} from "_Model/Websocket/PointInterface";
import {UserInterface} from "_Model/UserInterface";
import {ViewportInterface} from "_Model/Websocket/ViewportMessage";

interface ZoneDescriptor {
    i: number;
    j: number;
}

export class PositionNotifier {

    // TODO: we need a way to clean the zones if noone is in the zone and noone listening (to free memory!)

    private zones: Zone[][] = [];

    constructor(private zoneWidth: number, private zoneHeight: number, private onUserEnters: UserEntersCallback, private onUserMoves: UserMovesCallback, private onUserLeaves: UserLeavesCallback) {
    }

    private getZoneDescriptorFromCoordinates(x: number, y: number): ZoneDescriptor {
        return {
            i: Math.floor(x / this.zoneWidth),
            j: Math.floor(y / this.zoneHeight),
        }
    }

    public setViewport(user: UserInterface, viewport: ViewportInterface): void {
        if (viewport.left > viewport.right || viewport.top > viewport.bottom) {
            console.warn('Invalid viewport received: ', viewport);
            return;
        }

        const oldZones = user.listenedZones;
        const newZones = new Set<Zone>();

        const topLeftDesc = this.getZoneDescriptorFromCoordinates(viewport.left, viewport.top);
        const bottomRightDesc = this.getZoneDescriptorFromCoordinates(viewport.right, viewport.bottom);

        for (let j = topLeftDesc.j; j <= bottomRightDesc.j; j++) {
            for (let i = topLeftDesc.i; i <= bottomRightDesc.i; i++) {
                newZones.add(this.getZone(i, j));
            }
        }

        const addedZones = [...newZones].filter(x => !oldZones.has(x));
        const removedZones = [...oldZones].filter(x => !newZones.has(x));

        for (const zone of addedZones) {
            zone.startListening(user);
        }
        for (const zone of removedZones) {
            zone.stopListening(user);
        }
    }

    public updatePosition(user: UserInterface, userPosition: PointInterface): void {
        // Did we change zone?
        const oldZoneDesc = this.getZoneDescriptorFromCoordinates(user.position.x, user.position.y);
        const newZoneDesc = this.getZoneDescriptorFromCoordinates(userPosition.x, userPosition.y);

        if (oldZoneDesc.i != newZoneDesc.i || oldZoneDesc.j != newZoneDesc.j) {
            const oldZone = this.getZone(oldZoneDesc.i, oldZoneDesc.j);
            const newZone = this.getZone(newZoneDesc.i, newZoneDesc.j);

            // Leave old zone
            oldZone.leave(user, newZone);

            // Enter new zone
            newZone.enter(user, oldZone, userPosition);
        } else {
            const zone = this.getZone(oldZoneDesc.i, oldZoneDesc.j);
            zone.move(user, userPosition);
        }
    }

    public leave(user: UserInterface): void {
        const oldZoneDesc = this.getZoneDescriptorFromCoordinates(user.position.x, user.position.y);
        const oldZone = this.getZone(oldZoneDesc.i, oldZoneDesc.j);
        oldZone.leave(user, null);
    }

    private getZone(i: number, j: number): Zone {
        let zoneRow = this.zones[j];
        if (zoneRow === undefined) {
            zoneRow = new Array<Zone>();
            this.zones[j] = zoneRow;
        }

        let zone = this.zones[j][i];
        if (zone === undefined) {
            zone = new Zone(this.onUserEnters, this.onUserMoves, this.onUserLeaves);
            this.zones[j][i] = zone;
        }
        return zone;
    }
}
