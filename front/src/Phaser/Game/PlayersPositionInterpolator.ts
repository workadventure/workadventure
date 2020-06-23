/**
 * This class is in charge of computing the position of all players.
 * Player movement is delayed by 200ms so position depends on ticks.
 */
import {PlayerMovement} from "./PlayerMovement";
import {HasMovedEvent} from "./GameManager";

export class PlayersPositionInterpolator {
    playerMovements: Map<string, PlayerMovement> = new Map<string, PlayerMovement>();

    updatePlayerPosition(userId: string, playerMovement: PlayerMovement) : void {
        this.playerMovements.set(userId, playerMovement);
    }

    removePlayer(userId: string): void {
        this.playerMovements.delete(userId);
    }

    getUpdatedPositions(tick: number) : Map<string, HasMovedEvent> {
        const positions = new Map<string, HasMovedEvent>();
        this.playerMovements.forEach((playerMovement: PlayerMovement, userId: string) => {
            if (playerMovement.isOutdated(tick)) {
                //console.log("outdated")
                this.playerMovements.delete(userId);
            }
            //console.log("moving")
            positions.set(userId, playerMovement.getPosition(tick))
        });
        return positions;
    }
}
