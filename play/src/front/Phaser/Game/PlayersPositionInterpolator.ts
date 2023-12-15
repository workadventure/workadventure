/**
 * This class is in charge of computing the position of all players.
 * Player movement is delayed by 200ms so position depends on ticks.
 */
import type { HasPlayerMovedInterface } from "../../Api/Events/HasPlayerMovedInterface";
import type { PlayerMovement } from "./PlayerMovement";

export class PlayersPositionInterpolator {
    playerMovements: Map<number, PlayerMovement> = new Map<number, PlayerMovement>();

    updatePlayerPosition(userId: number, playerMovement: PlayerMovement): void {
        this.playerMovements.set(userId, playerMovement);
    }

    removePlayer(userId: number): void {
        this.playerMovements.delete(userId);
    }

    getUpdatedPositions(tick: number): Map<number, HasPlayerMovedInterface> {
        const positions = new Map<number, HasPlayerMovedInterface>();
        this.playerMovements.forEach((playerMovement: PlayerMovement, userId: number) => {
            if (playerMovement.isOutdated(tick)) {
                this.playerMovements.delete(userId);
            }
            positions.set(userId, playerMovement.getPosition(tick));
        });
        return positions;
    }
}
