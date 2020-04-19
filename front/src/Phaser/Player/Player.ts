import {getPlayerAnimations, playAnimation, PlayerAnimationNames} from "./Animation";
import {ActiveEventList, UserInputEvent, UserInputManager} from "../UserInput/UserInputManager";
import {PlayableCaracter} from "../Entity/PlayableCaracter";
import {gameManager} from "../../Connexion/GameManager";
import {Textures} from "../Game/GameScene";

export interface CurrentGamerInterface extends PlayableCaracter{
    userId : string;
    PlayerValue : string;
    initAnimation() : void;
    moveUser() : void;
    say(text : string) : void;
}

export class Player extends PlayableCaracter implements CurrentGamerInterface {
    userId: string;
    PlayerValue: string;
    userInputManager: UserInputManager;
    private email: string;

    constructor(
        userId: string,
        email: string,
        Scene: Phaser.Scene,
        x: number,
        y: number,
        PlayerValue: string = Textures.Player
    ) {
        super(Scene, x, y, PlayerValue, 1);

        //create input to move
        this.userInputManager = new UserInputManager(Scene);

        //set data
        this.userId = userId;
        this.email = email;
        this.PlayerValue = PlayerValue;

        //the current player model should be push away by other players to prevent conflict
        this.setImmovable(false);
        this.say("My email is "+this.email)
    }

    moveUser(): void {
        //if user client on shift, camera and player speed
        let haveMove = false;
        let direction = null;

        let activeEvents = this.userInputManager.getEventListForGameTick();
        let speedMultiplier = activeEvents.get(UserInputEvent.SpeedUp) ? 500 : 100;

        if (activeEvents.get(UserInputEvent.MoveUp)) {
            this.move(0, -speedMultiplier);
            haveMove = true;
            direction = PlayerAnimationNames.WalkUp;
        }
        if (activeEvents.get(UserInputEvent.MoveLeft)) {
            this.move(-speedMultiplier, 0);
            haveMove = true;
            direction = PlayerAnimationNames.WalkLeft;
        }
        if (activeEvents.get(UserInputEvent.MoveDown)) {
            this.move(0, speedMultiplier);
            haveMove = true;
            direction = PlayerAnimationNames.WalkDown;
        }
        if (activeEvents.get(UserInputEvent.MoveRight)) {
            this.move(speedMultiplier, 0);
            haveMove = true;
            direction = PlayerAnimationNames.WalkRight;
        }
        if (!haveMove) {
            direction = PlayerAnimationNames.None;
            this.stop();
        }
        
        gameManager.updateConnectedUserPosition(this.x, this.y);
    }
}