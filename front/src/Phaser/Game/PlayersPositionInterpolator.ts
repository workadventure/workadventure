/**
 * This class is in charge of computing the position of all players.
 * Player movement is delayed by 200ms so position depends on ticks.
 */
import type { HasPlayerMovedEvent } from "../../Api/Events/HasPlayerMovedEvent";
import type { PlayerMovement } from "./PlayerMovement";

export class PlayersPositionInterpolator {
    playerMovements: Map<number, PlayerMovement> = new Map<number, PlayerMovement>();

    updatePlayerPosition(userId: number, playerMovement: PlayerMovement): void {
        this.playerMovements.set(userId, playerMovement);
    }

    removePlayer(userId: number): void {
        this.playerMovements.delete(userId);
    }

    getUpdatedPositions(tick: number): Map<number, HasPlayerMovedEvent> {
        const positions = new Map<number, HasPlayerMovedEvent>();
        this.playerMovements.forEach((playerMovement: PlayerMovement, userId: number) => {
            if (playerMovement.isOutdated(tick)) {
                //console.log("outdated")
                this.playerMovements.delete(userId);
            }
            //console.log("moving")
            positions.set(userId, playerMovement.getPosition(tick));
        });
        return positions;
    }
}
