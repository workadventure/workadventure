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
import type { ZoneMessage } from "@workadventure/messages";
import type { Socket } from "../services/SocketManager";
import { Zone } from "./Zone";
import type { ZoneEventListener } from "./Zone";
import type { ViewportInterface } from "./Websocket/ViewportMessage";
import type { PusherRoom } from "./PusherRoom";

interface ZoneDescriptor {
    i: number;
    j: number;
}

export class PositionDispatcher {
    private zones: Map<string, Zone> = new Map();

    constructor(
        public readonly roomId: string,
        private zoneWidth: number,
        private zoneHeight: number,
        private socketListener: ZoneEventListener,
        private pusherRoom: PusherRoom
    ) {}

    private getZoneDescriptorFromCoordinates(x: number, y: number): ZoneDescriptor {
        return {
            i: Math.floor(x / this.zoneWidth),
            j: Math.floor(y / this.zoneHeight),
        };
    }

    private getZoneKey(i: number, j: number): string {
        return `${i},${j}`;
    }

    /**
     * Sets the viewport coordinates.
     */
    public setViewport(socket: Socket, viewport: ViewportInterface): void {
        if (viewport.left > viewport.right || viewport.top > viewport.bottom) {
            console.warn("Invalid viewport received: ", viewport);
            return;
        }

        const oldZones = socket.getUserData().listenedZones;
        const newZones = new Set<string>();

        const topLeftDesc = this.getZoneDescriptorFromCoordinates(viewport.left, viewport.top);
        const bottomRightDesc = this.getZoneDescriptorFromCoordinates(viewport.right, viewport.bottom);

        for (let j = topLeftDesc.j; j <= bottomRightDesc.j; j++) {
            for (let i = topLeftDesc.i; i <= bottomRightDesc.i; i++) {
                newZones.add(this.getZoneKey(i, j));
            }
        }

        const addedZones = [...newZones].filter((zoneKey) => !oldZones.has(zoneKey));
        const removedZones = [...oldZones].filter((zoneKey) => !newZones.has(zoneKey));

        for (const zoneKey of addedZones) {
            const [i, j] = zoneKey.split(",").map(Number);
            this.subscribeZone(socket, i, j);
        }
        for (const zoneKey of removedZones) {
            const [i, j] = zoneKey.split(",").map(Number);
            this.unsubscribeZone(socket, i, j);
        }
    }

    private subscribeZone(socket: Socket, i: number, j: number): void {
        const zoneKey = this.getZoneKey(i, j);
        const userData = socket.getUserData();
        let zone = this.zones.get(zoneKey);
        let isNewZone = false;
        if (!zone) {
            zone = new Zone(this.socketListener, i, j);
            this.zones.set(zoneKey, zone);
            isNewZone = true;
        }
        // Add to socket's listened zones
        userData.listenedZones.add(zoneKey);
        // Add socket as listener to the zone
        zone.startListening(socket);
        // Subscribe to back if this is the first listener for this zone
        if (isNewZone) {
            this.pusherRoom.subscribeToZone(i, j);
        }
    }

    private unsubscribeZone(socket: Socket, i: number, j: number): void {
        const zoneKey = this.getZoneKey(i, j);
        const userData = socket.getUserData();
        const zone = this.zones.get(zoneKey);
        // Remove from socket's listened zones
        userData.listenedZones.delete(zoneKey);
        if (!zone) {
            return;
        }
        zone.stopListening(socket);
        // Clean up zone if no more listeners
        if (!zone.hasListeners()) {
            this.zones.delete(zoneKey);
            this.pusherRoom.unsubscribeFromZone(i, j);
        }
    }

    public removeViewport(socket: Socket): void {
        const listenedZones = socket.getUserData().listenedZones;
        if (listenedZones) {
            for (const zoneKey of [...listenedZones]) {
                const [i, j] = zoneKey.split(",").map(Number);
                this.unsubscribeZone(socket, i, j);
            }
        }
    }

    public isEmpty(): boolean {
        return this.zones.size === 0;
    }

    /**
     * Route a message directly to the concerned zone.
     * The back now sends all zone messages wrapped in ZoneMessage with coordinates (x, y).
     * No need to loop over all zones: we route directly to the impacted zone.
     */
    public handleZoneMessage(zoneMessage: ZoneMessage): void {
        const { x, y, message } = zoneMessage;
        const zone = this.zones.get(this.getZoneKey(x, y));

        if (!zone) {
            // The zone has no listeners currently, ignore the message
            return;
        }

        if (!message) {
            console.error("ZoneMessage has no message payload");
            return;
        }

        // Route the message to the concerned zone
        switch (message.$case) {
            case "userJoinedZoneMessage":
                zone.handleUserJoinedZone(message.userJoinedZoneMessage);
                break;
            case "userMovedMessage":
                zone.handleUserMoved(message.userMovedMessage);
                break;
            case "userLeftZoneMessage":
                zone.handleUserLeftZone(message.userLeftZoneMessage);
                break;
            case "groupUpdateZoneMessage":
                zone.handleGroupUpdateZone(message.groupUpdateZoneMessage);
                break;
            case "groupLeftZoneMessage":
                zone.handleGroupLeftZone(message.groupLeftZoneMessage);
                break;
            case "emoteEventMessage":
                zone.handleEmoteEvent(message.emoteEventMessage);
                break;
            case "playerDetailsUpdatedMessage":
                zone.handlePlayerDetailsUpdated(message.playerDetailsUpdatedMessage);
                break;
            case "groupUsersUpdateMessage":
                zone.handleGroupUsersUpdate(message.groupUsersUpdateMessage);
                break;
            default: {
                const _exhaustiveCheck: never = message;
            }
        }
    }
}
