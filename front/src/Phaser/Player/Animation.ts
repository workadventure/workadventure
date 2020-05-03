import {Textures} from "../Game/GameScene";

interface AnimationData {
    key: string;
    frameRate: number;
    repeat: number;
    frameModel: string; //todo use an enum
    frameStart: number;
    frameEnd: number;
}

export enum PlayerAnimationNames {
    WalkDown = 'down',
    WalkLeft = 'left',
    WalkUp = 'up',
    WalkRight = 'right',
    None = 'none',
}

export const getPlayerAnimations = (name: string = Textures.Player): AnimationData[] => {
    return [{
        key: PlayerAnimationNames.WalkDown, //TODO chnage, it's a key for one anumation of ine user type.
        frameModel: name,
        frameStart: 0,
        frameEnd: 2,
        frameRate: 10,
        repeat: -1
    }, {
        key: PlayerAnimationNames.WalkLeft,
        frameModel: name,
        frameStart: 3,
        frameEnd: 5,
        frameRate: 10,
        repeat: -1
    }, {
        key: PlayerAnimationNames.WalkRight,
        frameModel: name,
        frameStart: 6,
        frameEnd: 8,
        frameRate: 10,
        repeat: -1
    }, {
        key: PlayerAnimationNames.WalkUp,
        frameModel: name,
        frameStart: 9,
        frameEnd: 11,
        frameRate: 10,
        repeat: -1
    }];
};

export const playAnimation = (Player : Phaser.GameObjects.Sprite, direction : string) => {
    if (!Player.anims.currentAnim || Player.anims.currentAnim.key !== direction) {
        Player.anims.play(direction);
    } else if (direction === PlayerAnimationNames.None && Player.anims.currentAnim) {
        Player.anims.currentAnim.destroy();
    }
}
