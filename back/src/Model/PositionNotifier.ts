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
import { EmoteEventMessage, SetPlayerDetailsMessage } from "@workadventure/messages";
import { Movable } from "../Model/Movable";
import { PositionInterface } from "../Model/PositionInterface";
import { ZoneSocket } from "../RoomManager";
import { User } from "../Model/User";
import {
    EmoteCallback,
    EntersCallback,
    LeavesCallback,
    LockGroupCallback,
    MovesCallback,
    PlayerDetailsUpdatedCallback,
    Zone,
} from "./Zone";

interface ZoneDescriptor {
    i: number;
    j: number;
}

export function* getNearbyDescriptorsMatrix(middleZoneDescriptor: ZoneDescriptor): Generator<ZoneDescriptor> {
    for (let n = 0; n < 9; n++) {
        const i = middleZoneDescriptor.i + ((n % 3) - 1);
        const j = middleZoneDescriptor.j + (Math.floor(n / 3) - 1);

        if (i >= 0 && j >= 0) {
            yield { i, j };
        }
    }
}

export class PositionNotifier {
    // TODO: we need a way to clean the zones if no one is in the zone and no one listening (to free memory!)

    private zones: Zone[][] = [];

    constructor(
        private readonly zoneWidth: number,
        private readonly zoneHeight: number,
        private onUserEnters: EntersCallback,
        private onUserMoves: MovesCallback,
        private onUserLeaves: LeavesCallback,
        private onEmote: EmoteCallback,
        private onLockGroup: LockGroupCallback,
        private onPlayerDetailsUpdated: PlayerDetailsUpdatedCallback
    ) {}

    private getZoneDescriptorFromCoordinates(x: number, y: number): ZoneDescriptor {
        return {
            i: Math.floor(x / this.zoneWidth),
            j: Math.floor(y / this.zoneHeight),
        };
    }

    public enter(thing: Movable): Zone {
        const position = thing.getPosition();
        const zoneDesc = this.getZoneDescriptorFromCoordinates(position.x, position.y);
        const zone = this.getZone(zoneDesc.i, zoneDesc.j);
        zone.enter(thing, null, position);
        return zone;
    }

    public updatePosition(thing: Movable, newPosition: PositionInterface, oldPosition: PositionInterface): Zone {
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
            return newZone;
        } else {
            const zone = this.getZone(oldZoneDesc.i, oldZoneDesc.j);
            zone.move(thing, newPosition);
            return zone;
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
            zone = new Zone(
                this.onUserEnters,
                this.onUserMoves,
                this.onUserLeaves,
                this.onEmote,
                this.onLockGroup,
                this.onPlayerDetailsUpdated,
                i,
                j
            );
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

    public emitLockGroupEvent(user: User, groupId: number) {
        const zoneDesc = this.getZoneDescriptorFromCoordinates(user.getPosition().x, user.getPosition().y);
        const zone = this.getZone(zoneDesc.i, zoneDesc.j);
        zone.emitLockGroupEvent(groupId);
    }

    public *getAllUsersInSquareAroundZone(zone: Zone): Generator<User> {
        const zoneDescriptor = this.getZoneDescriptorFromCoordinates(zone.x, zone.y);
        for (const d of getNearbyDescriptorsMatrix(zoneDescriptor)) {
            const zone = this.getZone(d.i, d.j);
            for (const thing of zone.getThings()) {
                if (thing instanceof User) {
                    yield thing;
                }
            }
        }
    }

    public updatePlayerDetails(user: User, playerDetails: SetPlayerDetailsMessage) {
        const position = user.getPosition();
        const zoneDesc = this.getZoneDescriptorFromCoordinates(position.x, position.y);
        const zone = this.getZone(zoneDesc.i, zoneDesc.j);
        zone.updatePlayerDetails(user, playerDetails);
    }
}
