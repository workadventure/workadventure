
import { requestVisitCardsStore } from "../../Stores/GameStore";
import { ActionsMenuData, actionsMenuStore } from '../../Stores/ActionsMenuStore';
import { Character } from "../Entity/Character";
import type { GameScene } from "../Game/GameScene";
import type { PointInterface } from "../../Connexion/ConnexionModels";
import type { PlayerAnimationDirections } from "../Player/Animation";
import type { Unsubscriber } from 'svelte/store';

/**
 * Class representing the sprite of a remote player (a player that plays on another computer)
 */
export class RemotePlayer extends Character {
    userId: number;
    private visitCardUrl: string | null;

    private isActionsMenuInitialized: boolean = false;
    private actionsMenuStoreUnsubscriber: Unsubscriber;

    constructor(
        userId: number,
        Scene: GameScene,
        x: number,
        y: number,
        name: string,
        texturesPromise: Promise<string[]>,
        direction: PlayerAnimationDirections,
        moving: boolean,
        visitCardUrl: string | null,
        companion: string | null,
        companionTexturePromise?: Promise<string>
    ) {
        super(
            Scene,
            x,
            y,
            texturesPromise,
            name,
            direction,
            moving,
            1,
            !!visitCardUrl,
            companion,
            companionTexturePromise
        );

        //set data
        this.userId = userId;
        this.visitCardUrl = visitCardUrl;
        this.actionsMenuStoreUnsubscriber = actionsMenuStore.subscribe((value: ActionsMenuData | undefined) => {
            this.isActionsMenuInitialized = value ? true : false;
        });

        this.on(Phaser.Input.Events.POINTER_DOWN, (event: Phaser.Input.Pointer) => {
            if (event.downElement.nodeName === "CANVAS") {
                if (this.isActionsMenuInitialized) {
                    actionsMenuStore.clear();
                    return;
                }
                actionsMenuStore.initialize(this.playerName);
                for (const action of this.getActionsMenuActions()) {
                    actionsMenuStore.addAction(action.actionName, action.callback);
                }
            }
        });
    }

    public updatePosition(position: PointInterface): void {
        this.playAnimation(position.direction as PlayerAnimationDirections, position.moving);
        this.setX(position.x);
        this.setY(position.y);

        this.setDepth(position.y); //this is to make sure the perspective (player models closer the bottom of the screen will appear in front of models nearer the top of the screen).

        if (this.companion) {
            this.companion.setTarget(position.x, position.y, position.direction as PlayerAnimationDirections);
        }
    }

    public destroy(): void {
        this.actionsMenuStoreUnsubscriber();
        actionsMenuStore.clear();
        super.destroy();
    }

    private getActionsMenuActions(): { actionName: string, callback: Function }[] {
        return [
            {
                actionName: "Visiting Card",
                callback: () => {
                    requestVisitCardsStore.set(this.visitCardUrl);
                    actionsMenuStore.clear();
                }
            },
            {
                actionName: "Log Hello",
                callback: () => {
                    console.log('HELLO');
                }
            },
            {
                actionName: "Log Goodbye",
                callback: () => {
                    console.log('GOODBYE');
                }
            },
            {
                actionName: "Clear Goodbye Action",
                callback: () => {
                    actionsMenuStore.removeAction("Log Goodbye");
                }
            },
        ];
    }
}
