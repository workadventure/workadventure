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
import * as Sentry from "@sentry/node";
import type { PusherWebSocket } from "../services/PusherWebSocket";
import { Zone } from "./Zone";
import type { ZoneEventListener } from "./Zone";
import type { ViewportInterface } from "./Websocket/ViewportMessage";
import type { PusherRoom } from "./PusherRoom";

interface ZoneDescriptor {
    i: number;
    j: number;
}

/**
 * Maximum number of zones a single viewport is allowed to cover.
 *
 * The viewport is sent by the client and is therefore untrusted: nothing prevents a buggy (or malicious) client
 * from announcing a viewport spanning the whole int32 range, which would make us subscribe to millions of zones
 * on the back (and freeze the pusher in the nested loop below).
 *
 * 1600 zones is a 40x40 grid of 320px zones, i.e. a 12800x12800px window, about 25 times a standard 1080p
 * viewport. A viewport can legitimately go above that on a very large map (the front allows dezooming until the
 * whole map fits on screen), which is why an oversized viewport is cropped rather than rejected: see
 * boundZoneRectangle().
 */
export const MAX_ZONES_PER_VIEWPORT = 1600;

export class PositionDispatcher {
    private zones: Map<string, Zone> = new Map();
    private oversizedViewportsCropped = 0;

    constructor(
        public readonly roomId: string,
        private zoneWidth: number,
        private zoneHeight: number,
        private socketListener: ZoneEventListener,
        private pusherRoom: PusherRoom,
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
     * Ensures the rectangle of zones covered by a viewport stays under MAX_ZONES_PER_VIEWPORT.
     *
     * An oversized viewport is cropped around its center rather than rejected: we keep serving the player what
     * is in the middle of their screen instead of freezing them on their previous zones. This covers the two
     * cases at once:
     *  - a legitimate one (a player fully dezoomed on a very large map): they keep seeing the players around the
     *    center of their view, and lose the ones on the far edges;
     *  - an abnormal one (a buggy front sending a viewport of a few million pixels, or a hand-crafted client
     *    trying to subscribe to the whole map): the fan-out is bounded, whatever they send.
     */
    private boundZoneRectangle(
        topLeft: ZoneDescriptor,
        bottomRight: ZoneDescriptor,
        viewport: ViewportInterface,
    ): { topLeft: ZoneDescriptor; bottomRight: ZoneDescriptor } {
        const width = bottomRight.i - topLeft.i + 1;
        const height = bottomRight.j - topLeft.j + 1;
        if (width * height <= MAX_ZONES_PER_VIEWPORT) {
            return { topLeft, bottomRight };
        }

        // Shrink both sides by the same ratio to keep the aspect ratio of the viewport.
        const ratio = Math.sqrt(MAX_ZONES_PER_VIEWPORT / (width * height));
        let croppedWidth = Math.max(1, Math.floor(width * ratio));
        let croppedHeight = Math.max(1, Math.floor(height * ratio));
        // On a very elongated viewport, one of the two sides is floored to 1 and the ratio no longer holds:
        // trim the longest side so that the product is under the limit in every case.
        if (croppedWidth * croppedHeight > MAX_ZONES_PER_VIEWPORT) {
            if (croppedWidth >= croppedHeight) {
                croppedWidth = Math.max(1, Math.floor(MAX_ZONES_PER_VIEWPORT / croppedHeight));
            } else {
                croppedHeight = Math.max(1, Math.floor(MAX_ZONES_PER_VIEWPORT / croppedWidth));
            }
        }

        const centerI = Math.floor((topLeft.i + bottomRight.i) / 2);
        const centerJ = Math.floor((topLeft.j + bottomRight.j) / 2);
        const croppedTopLeft = {
            i: centerI - Math.floor((croppedWidth - 1) / 2),
            j: centerJ - Math.floor((croppedHeight - 1) / 2),
        };

        this.oversizedViewportsCropped++;
        // Only report the first occurrence for this room: viewports are sent at a high rate, we do not want to
        // flood the logs / Sentry when a client keeps sending the same oversized viewport.
        if (this.oversizedViewportsCropped === 1) {
            const message = `Oversized viewport cropped in room ${this.roomId}: ${
                width * height
            } zones requested (max ${MAX_ZONES_PER_VIEWPORT})`;
            console.warn(message, viewport);
            Sentry.captureMessage(message, {
                extra: { roomId: this.roomId, requestedZones: width * height, viewport },
            });
        }

        return {
            topLeft: croppedTopLeft,
            bottomRight: {
                i: croppedTopLeft.i + croppedWidth - 1,
                j: croppedTopLeft.j + croppedHeight - 1,
            },
        };
    }

    /**
     * Sets the viewport coordinates.
     */
    public setViewport(socket: PusherWebSocket, viewport: ViewportInterface): void {
        if (
            !Number.isFinite(viewport.left) ||
            !Number.isFinite(viewport.right) ||
            !Number.isFinite(viewport.top) ||
            !Number.isFinite(viewport.bottom) ||
            viewport.left > viewport.right ||
            viewport.top > viewport.bottom
        ) {
            console.warn("Invalid viewport received: ", viewport);
            return;
        }

        // The rectangle must be bounded BEFORE looping: it is the loop itself that would freeze the pusher.
        const { topLeft, bottomRight } = this.boundZoneRectangle(
            this.getZoneDescriptorFromCoordinates(viewport.left, viewport.top),
            this.getZoneDescriptorFromCoordinates(viewport.right, viewport.bottom),
            viewport,
        );

        const oldZones = socket.getUserData().listenedZones;
        const newZones = new Set<string>();

        for (let j = topLeft.j; j <= bottomRight.j; j++) {
            for (let i = topLeft.i; i <= bottomRight.i; i++) {
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

    private subscribeZone(socket: PusherWebSocket, i: number, j: number): void {
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

    private unsubscribeZone(socket: PusherWebSocket, i: number, j: number): void {
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

    public removeViewport(socket: PusherWebSocket): void {
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
