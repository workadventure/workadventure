import type {GameScene} from "../Game/GameScene";
import type {PointInterface} from "../../Connexion/ConnexionModels";
import {Character} from "../Entity/Character";
import type {PlayerAnimationDirections} from "../Player/Animation";
import {requestVisitCardsStore} from "../../Stores/GameStore";


/**
 * Class representing the sprite of a remote player (a player that plays on another computer)
 */
export class RemotePlayer extends Character {
    userId: number;
    private visitCardUrl: string|null;

    constructor(
        userId: number,
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: Promise<string[]>,
        direction: PlayerAnimationDirections,
        moving: boolean,
        visitCardUrl: string|null,
        companion: string|null,
        companionTexturePromise?: Promise<string>
    ) {
        super(Scene, x, y, texturesPromise, name, direction, moving, 1, !!visitCardUrl, companion, companionTexturePromise);
        
        //set data
        this.userId = userId;
        this.visitCardUrl = visitCardUrl;
        
        this.on('pointerdown', () => {
            requestVisitCardsStore.set(this.visitCardUrl);
        })
    }

    updatePosition(position: PointInterface): void {
        this.playAnimation(position.direction as PlayerAnimationDirections, position.moving);
        this.setX(position.x);
        this.setY(position.y);

        this.setDepth(position.y); //this is to make sure the perspective (player models closer the bottom of the screen will appear in front of models nearer the top of the screen).

        if (this.companion) {
            this.companion.setTarget(position.x, position.y, position.direction as PlayerAnimationDirections);
        }
    }
}
