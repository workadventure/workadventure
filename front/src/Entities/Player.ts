import {AnimationData} from "../Interfaces/AnimationData";
import {manageCaracterWalkAnimation} from "../Managers/Animation.manager";

let playerSprit: Phaser.GameObjects.Sprite = null;

export enum PlayerAnimationNames {
    WalkDown = 'down',
    WalkLeft = 'left',
    WalkUp = 'up',
    WalkRight = 'right',
}

export const getPlayerAnimations = (): AnimationData[] => {
    return [{
        key: PlayerAnimationNames.WalkDown,
        frameModel: 'player',
        frameStart: 0,
        frameEnd: 2,
        frameRate: 10,
        repeat: -1
    }, {
        key: PlayerAnimationNames.WalkLeft,
        frameModel: 'player',
        frameStart: 3,
        frameEnd: 5,
        frameRate: 10,
        repeat: -1
    }, {
        key: PlayerAnimationNames.WalkRight,
        frameModel: 'player',
        frameStart: 6,
        frameEnd: 8,
        frameRate: 10,
        repeat: -1
    }, {
        key: PlayerAnimationNames.WalkUp,
        frameModel: 'player',
        frameStart: 9,
        frameEnd: 11,
        frameRate: 10,
        repeat: -1
    }];
}

export const instantiate = (sprit: Phaser.GameObjects.Sprite) => {
    playerSprit = sprit
}

export const move = (direction: string): void => {
    //todo: implement player movement here
}