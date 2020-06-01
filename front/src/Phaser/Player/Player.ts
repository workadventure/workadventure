import {PlayerAnimationNames} from "./Animation";
import {GameScene, Textures} from "../Game/GameScene";
import {MessageUserPositionInterface, PointInterface} from "../../Connection";
import {ActiveEventList, UserInputEvent, UserInputManager} from "../UserInput/UserInputManager";
import {PlayableCaracter} from "../Entity/PlayableCaracter";


export const hasMovedEventName = "hasMoved";
export interface CurrentGamerInterface extends PlayableCaracter{
    moveUser(delta: number) : void;
    say(text : string) : void;
}

export interface GamerInterface extends PlayableCaracter{
    userId : string;
    updatePosition(position: PointInterface): void;
    say(text : string) : void;
}

interface AnimationData {
    key: string;
    frameRate: number;
    repeat: number;
    frameModel: string; //todo use an enum
    frameStart: number;
    frameEnd: number;
}


export class Player extends PlayableCaracter implements CurrentGamerInterface, GamerInterface {
    userId: string;
    userInputManager: UserInputManager;
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
        super(Scene, x, y, PlayerTexture, name, 1);

        //create input to move
        this.userInputManager = new UserInputManager(Scene);

        //set data
        this.userId = userId;

        //the current player model should be push away by other players to prevent conflict
        this.setImmovable(false);
        this.initAnimation();

        this.playAnimation(direction, moving);
    }

    private initAnimation(): void {
        this.getPlayerAnimations(this.PlayerTexture).forEach(d => {
            this.scene.anims.create({
                key: d.key,
                frames: this.scene.anims.generateFrameNumbers(d.frameModel, {start: d.frameStart, end: d.frameEnd}),
                frameRate: d.frameRate,
                repeat: d.repeat
            });
        })
    }

    private getPlayerAnimations(name: string): AnimationData[] {
        return [{
            key: `${name}-${PlayerAnimationNames.WalkDown}`,
            frameModel: name,
            frameStart: 0,
            frameEnd: 2,
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationNames.WalkLeft}`,
            frameModel: name,
            frameStart: 3,
            frameEnd: 5,
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationNames.WalkRight}`,
            frameModel: name,
            frameStart: 6,
            frameEnd: 8,
            frameRate: 10,
            repeat: -1
        }, {
            key: `${name}-${PlayerAnimationNames.WalkUp}`,
            frameModel: name,
            frameStart: 9,
            frameEnd: 11,
            frameRate: 10,
            repeat: -1
        }];
    }

    moveUser(delta: number): void {
        //if user client on shift, camera and player speed
        let direction = null;
        let moving = false;

        let activeEvents = this.userInputManager.getEventListForGameTick();
        let speedMultiplier = activeEvents.get(UserInputEvent.SpeedUp) ? 25 : 9;
        let moveAmount = speedMultiplier * 20;

        let x = 0;
        let y = 0;
        if (activeEvents.get(UserInputEvent.MoveUp)) {
            y = - moveAmount;
            direction = PlayerAnimationNames.WalkUp;
            moving = true;
        } else if (activeEvents.get(UserInputEvent.MoveDown)) {
            y = moveAmount;
            direction = PlayerAnimationNames.WalkDown;
            moving = true;
        }
        if (activeEvents.get(UserInputEvent.MoveLeft)) {
            x = -moveAmount;
            direction = PlayerAnimationNames.WalkLeft;
            moving = true;
        } else if (activeEvents.get(UserInputEvent.MoveRight)) {
            x = moveAmount;
            direction = PlayerAnimationNames.WalkRight;
            moving = true;
        }
        if (x !== 0 || y !== 0) {
            this.move(x, y);
            this.emit(hasMovedEventName, {moving, direction, x: this.x, y: this.y});
        } else {
            if (this.wasMoving) {
                //direction = PlayerAnimationNames.None;
                this.stop();
                this.emit(hasMovedEventName, {moving, direction: this.previousDirection, x: this.x, y: this.y});
            }
        }

        if (direction !== null) {
            this.previousDirection = direction;
        }
        this.wasMoving = moving;
    }

    //todo: put this method into the NonPlayer class instead
    updatePosition(position: PointInterface): void {
        this.playAnimation(position.direction, position.moving);
        this.setX(position.x);
        this.setY(position.y);
        this.setDepth(position.y);
    }

    private playAnimation(direction : string, moving: boolean): void {
        if (moving && (!this.anims.currentAnim || this.anims.currentAnim.key !== direction)) {
            this.play(this.PlayerTexture+'-'+direction, true);
        } else if (!moving) {
            /*if (this.anims.currentAnim) {
                this.anims.stop();
            }*/
            this.play(this.PlayerTexture+'-'+direction, true);
            this.stop();
        }
    }
}
