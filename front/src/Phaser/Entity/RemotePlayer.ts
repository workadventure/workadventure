import {GameScene} from "../Game/GameScene";
import {PointInterface} from "../../Connection";
import {Character} from "../Entity/Character";

/**
 * Class representing the sprite of a remote player (a player that plays on another computer)
 */
export class RemotePlayer extends Character {
    userId: string;
    previousDirection: string;
    wasMoving: boolean;

    constructor(
        userId: string,
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        PlayerTexture: string,
        direction: string,
        moving: boolean
    ) {
        super(Scene, x, y, PlayerTexture, name, direction, moving, 1);

        //set data
        this.userId = userId;

        //the current player model should be push away by other players to prevent conflict
        //this.setImmovable(false);
    }

    updatePosition(position: PointInterface): void {
        this.playAnimation(position.direction, position.moving);
        this.setX(position.x);
        this.setY(position.y);
        this.setDepth(position.y);
    }
}
