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
import {EmoteCallback, EntersCallback, LeavesCallback, MovesCallback, Zone} from "./Zone";
import {Movable} from "_Model/Movable";
import {PositionInterface} from "_Model/PositionInterface";
import {ZoneSocket} from "../RoomManager";
import {User} from "_Model/User";
import {EmoteEventMessage} from "../Messages/generated/messages_pb";

interface ZoneDescriptor {
    i: number;
    j: number;
}

export class PositionNotifier {

    // TODO: we need a way to clean the zones if noone is in the zone and noone listening (to free memory!)

    private zones: Zone[][] = [];

    constructor(private zoneWidth: number, private zoneHeight: number, private onUserEnters: EntersCallback, private onUserMoves: MovesCallback, private onUserLeaves: LeavesCallback, private onEmote: EmoteCallback) {
    }

    private getZoneDescriptorFromCoordinates(x: number, y: number): ZoneDescriptor {
        return {
            i: Math.floor(x / this.zoneWidth),
            j: Math.floor(y / this.zoneHeight),
        }
    }

    public enter(thing: Movable): void {
        const position = thing.getPosition();
        const zoneDesc = this.getZoneDescriptorFromCoordinates(position.x, position.y);
        const zone = this.getZone(zoneDesc.i, zoneDesc.j);
        zone.enter(thing, null, position);
    }

    public updatePosition(thing: Movable, newPosition: PositionInterface, oldPosition: PositionInterface): void {
        // Did we change zone?
        const oldZoneDesc = this.getZoneDescriptorFromCoordinates(oldPosition.x, oldPosition.y);
        const newZoneDesc = this.getZoneDescriptorFromCoordinates(newPosition.x, newPosition.y);

        if (oldZoneDesc.i != newZoneDesc.i || oldZoneDesc.j != newZoneDesc.j) {
            const oldZone = this.getZone(oldZoneDesc.i, oldZoneDesc.j);
            const newZone = this.getZone(newZoneDesc.i, newZoneDesc.j);

            // Leave old zone
            oldZone.leave(thing, newZone);

            // Enter new zone
            newZone.enter(thing, oldZone, newPosition);
        } else {
            const zone = this.getZone(oldZoneDesc.i, oldZoneDesc.j);
            zone.move(thing, newPosition);
        }
    }

    public leave(thing: Movable): void {
        const oldPosition = thing.getPosition();
        const oldZoneDesc = this.getZoneDescriptorFromCoordinates(oldPosition.x, oldPosition.y);
        const oldZone = this.getZone(oldZoneDesc.i, oldZoneDesc.j);
        oldZone.leave(thing, null);
    }

    private getZone(i: number, j: number): Zone {
        let zoneRow = this.zones[j];
        if (zoneRow === undefined) {
            zoneRow = new Array<Zone>();
            this.zones[j] = zoneRow;
        }

        let zone = this.zones[j][i];
        if (zone === undefined) {
            zone = new Zone(this.onUserEnters, this.onUserMoves, this.onUserLeaves, this.onEmote, i, j);
            this.zones[j][i] = zone;
        }
        return zone;
    }

    public addZoneListener(call: ZoneSocket, x: number, y: number): Set<Movable> {
        const zone = this.getZone(x, y);
        zone.addListener(call);
        return zone.getThings();
    }

    public removeZoneListener(call: ZoneSocket, x: number, y: number): void {
        const zone = this.getZone(x, y);
        zone.removeListener(call);
    }

    public emitEmoteEvent(user: User, emoteEventMessage: EmoteEventMessage) {
        const zoneDesc = this.getZoneDescriptorFromCoordinates(user.getPosition().x, user.getPosition().y);
        const zone = this.getZone(zoneDesc.i, zoneDesc.j);
        zone.emitEmoteEvent(emoteEventMessage);
        
    }
}
