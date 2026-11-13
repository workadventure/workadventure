import type { SeatDirection, SeatRectangle } from "@workadventure/map-editor";
import { getSeatPositions } from "@workadventure/map-editor";
import { PositionMessage_Direction } from "@workadventure/messages";
import type { HasPlayerMovedInterface } from "../../Api/Events/HasPlayerMovedInterface";
import type { Character } from "../Entity/Character";
import type { GameScene } from "./GameScene";

/** Other players' positions can be updated without any event here: check who sits where this often. */
const REFRESH_INTERVAL_MS = 250;
/** A player stopping this close to a seat object or area, in pixels, sits down. */
const SIT_MARGIN = 4;
/** A seat is taken when another player is this close to it. */
const OCCUPIED_DISTANCE = 6;

/** Whether a position is on the object or area a seat belongs to. */
function isOnSource(seat: Seat, x: number, y: number): boolean {
    const { source } = seat;
    return (
        x >= source.x - SIT_MARGIN &&
        x <= source.x + source.width + SIT_MARGIN &&
        y >= source.y - SIT_MARGIN &&
        y <= source.y + source.height + SIT_MARGIN
    );
}

interface Seat {
    key: string;
    source: SeatRectangle;
    x: number;
    y: number;
    direction: SeatDirection;
    /** Depth of a player seated here, or undefined to keep the usual depth (seats painted in the map's tiles). */
    depth: number | undefined;
}

const DIRECTIONS: Record<SeatDirection, PositionMessage_Direction> = {
    down: PositionMessage_Direction.DOWN,
    up: PositionMessage_Direction.UP,
    left: PositionMessage_Direction.LEFT,
    right: PositionMessage_Direction.RIGHT,
};

/**
 * Sits players down on seats (chairs, couches, or seat areas drawn over chairs painted in the map),
 * like in a cozy office: stop on a chair and you sit on it, facing the desk; walk away and you stand up.
 *
 * Nothing about sitting is sent to the server. A seated player is a player standing still exactly on
 * a seat, facing the way it faces: every client knows where the seats are, so each one draws the
 * players it sees seated on its own.
 */
export class SeatManager {
    private readonly refreshInterval: ReturnType<typeof setInterval>;
    private seatedAt: Seat | undefined;
    /**
     * The seat the player just stood up from: the player keeps its seated depth until stepping off
     * it, rather than popping in front of a backrest on the first step.
     */
    private leaving: Seat | undefined;
    /** The seat each other player sits on, or is still stepping off. */
    private readonly remoteSeats = new WeakMap<Character, Seat>();

    constructor(private readonly scene: GameScene) {
        this.refreshInterval = setInterval(() => this.refresh(), REFRESH_INTERVAL_MS);
    }

    /** Called on each move of the local player. */
    public onPlayerMoved(event: HasPlayerMovedInterface): void {
        const player = this.scene.CurrentPlayer;
        // The glide onto a seat moves the player too: that is not standing up.
        if (player.isGlidingToSeat) return;
        if (event.moving) {
            if (this.seatedAt !== undefined) this.standUp();
            if (this.leaving && !isOnSource(this.leaving, player.x, player.y)) this.finishLeaving();
            return;
        }
        // Stopping is also what moving onto the seat looks like: don't sit down a second time.
        if (this.seatedAt !== undefined) return;
        if (this.leaving && !isOnSource(this.leaving, player.x, player.y)) this.finishLeaving();

        const seat = this.findSeatToSitOn(player.x, player.y);
        if (!seat) return;
        this.leaving = undefined;
        // The seat is taken from now on. The player is drawn at the seated depth from the start of the
        // glide, so that it slides in front of the seat (or behind its backrest) instead of passing
        // behind the chair and popping in front of it on arrival.
        this.seatedAt = seat;
        player.setSeatedDepth(seat.depth ?? seat.y + 16);
        player.glideToSeat(seat.x, seat.y, DIRECTIONS[seat.direction]);
    }

    public destroy(): void {
        clearInterval(this.refreshInterval);
    }

    private standUp(): void {
        const player = this.scene.CurrentPlayer;
        const wasSeatedOn = player.isSeated ? this.seatedAt : undefined;
        this.seatedAt = undefined;
        player.cancelSeatGlide();
        if (wasSeatedOn && isOnSource(wasSeatedOn, player.x, player.y)) {
            this.leaving = wasSeatedOn;
        } else {
            player.setSeatedDepth(undefined);
        }
    }

    private finishLeaving(): void {
        this.leaving = undefined;
        this.scene.CurrentPlayer.setSeatedDepth(undefined);
    }

    private findSeatToSitOn(x: number, y: number): Seat | undefined {
        let best: { seat: Seat; distance: number } | undefined;
        for (const seat of this.collectSeats()) {
            if (!isOnSource(seat, x, y) || this.isTakenByAnotherPlayer(seat)) continue;
            const distance = Math.hypot(seat.x - x, seat.y - y);
            if (!best || distance < best.distance) best = { seat, distance };
        }
        return best?.seat;
    }

    private isTakenByAnotherPlayer(seat: Seat): boolean {
        for (const player of this.scene.MapPlayersByKey.values()) {
            if (Math.hypot(player.x - seat.x, player.y - seat.y) <= OCCUPIED_DISTANCE) return true;
        }
        return false;
    }

    /** Shows the other players seated or standing, and stands up the local player whose seat is gone. */
    private refresh(): void {
        const seats = this.collectSeats();
        for (const player of this.scene.MapPlayersByKey.values()) {
            this.applySeat(player, seats);
        }
        const seatedKey = this.seatedAt?.key;
        if (seatedKey !== undefined && !seats.some((seat) => seat.key === seatedKey)) {
            this.standUp();
            this.finishLeaving();
        }
        const leavingKey = this.leaving?.key;
        if (leavingKey !== undefined && !seats.some((seat) => seat.key === leavingKey)) {
            this.finishLeaving();
        }
    }

    /**
     * A player is seated when standing exactly on a seat: positions are synchronized to the pixel.
     * A player who stood up keeps the seated depth until stepping off the seat, as the local one does.
     */
    private applySeat(player: Character, seats: Seat[]): void {
        let seat = seats.find((s) => Math.abs(player.x - s.x) <= 1 && Math.abs(player.y - s.y) <= 1);
        const previous = this.remoteSeats.get(player);
        if (!seat && previous && isOnSource(previous, player.x, player.y)) {
            seat = seats.find((s) => s.key === previous.key);
        }
        if (seat) {
            this.remoteSeats.set(player, seat);
        } else {
            this.remoteSeats.delete(player);
        }
        player.setSeatedDepth(seat ? (seat.depth ?? seat.y + 16) : undefined);
    }

    private collectSeats(): Seat[] {
        const seats: Seat[] = [];

        for (const entity of this.scene.getGameMapFrontWrapper().getEntitiesManager().getEntities().values()) {
            for (const property of entity.getProperties()) {
                if (property.type !== "seat") continue;
                const source = { x: entity.x, y: entity.y, width: entity.displayWidth, height: entity.displayHeight };
                getSeatPositions(source, property).forEach((position, index) => {
                    seats.push({
                        key: `${entity.entityId}:${property.id}:${index}`,
                        source,
                        x: position.x,
                        y: position.y,
                        direction: position.direction,
                        // Just in front of the seat, or behind its backrest.
                        depth: position.inFront ? entity.depth + 1 : entity.depth - 1,
                    });
                });
            }
        }

        const areas = this.scene.getGameMap().getWamFile()?.getGameMapAreas().getAreas();
        for (const area of areas?.values() ?? []) {
            for (const property of area.properties) {
                if (property.type !== "seat") continue;
                const source = { x: area.x, y: area.y, width: area.width, height: area.height };
                getSeatPositions(source, property).forEach((position, index) => {
                    seats.push({
                        key: `area:${area.id}:${property.id}:${index}`,
                        source,
                        x: position.x,
                        y: position.y,
                        direction: position.direction,
                        depth: undefined,
                    });
                });
            }
        }

        return seats;
    }
}
