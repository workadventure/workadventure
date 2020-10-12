import {GameScene} from "../Game/GameScene";
import {PointInterface} from "../../Connexion/ConnexionModels";
import {Character} from "../Entity/Character";
import {Sprite} from "./Sprite";

/**
 * Class representing the sprite of a remote player (a player that plays on another computer)
 */
export class RemotePlayer extends Character {
    userId: number;
    private report: Sprite;

    constructor(
        userId: number,
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        PlayerTextures: string[],
        direction: string,
        moving: boolean
    ) {
        super(Scene, x, y, PlayerTextures, name, direction, moving, 1);

        //set data
        this.userId = userId;

        this.report = new Sprite(Scene, 20, -10, 'report_flag', 3);
        this.report.setInteractive();
        this.report.visible = false;
        this.report.on('pointerup', () => {
            //this.scene.events.emit('reportUser', {reportedUserId: userId, reportComment: comment});
            this.scene.events.emit('reportUser', {reportedUserId: this.userId, reportComment: 'test'});
            this.report.visible = false;
        });
        this.add(this.report);

        this.sprites.forEach((sprite: Sprite) => {
            sprite.on('pointerover', () => {
                this.report.visible = true;
            });
            sprite.on('pointerup', () => {
                this.report.visible = true;
            });
        })

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
