export enum PlayerAnimationDirections {
    Down = "down",
    Left = "left",
    Up = "up",
    Right = "right",
}
export enum PlayerAnimationTypes {
    Walk = "walk",
    Idle = "idle",
}

export interface AnimationData {
    key: string;
    frameRate: number;
    repeat: number;
    frameModel: string; //todo use an enum
    frames: number[];
}

export function getPlayerAnimations(name: string): AnimationData[] {
    return [
        {
            key: `${name}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Walk}`,
            frameModel: name,
            frames: [0, 1, 2, 1],
            frameRate: 10,
            repeat: -1,
        },
        {
            key: `${name}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Walk}`,
            frameModel: name,
            frames: [3, 4, 5, 4],
            frameRate: 10,
            repeat: -1,
        },
        {
            key: `${name}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Walk}`,
            frameModel: name,
            frames: [6, 7, 8, 7],
            frameRate: 10,
            repeat: -1,
        },
        {
            key: `${name}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Walk}`,
            frameModel: name,
            frames: [9, 10, 11, 10],
            frameRate: 10,
            repeat: -1,
        },
        {
            key: `${name}-${PlayerAnimationDirections.Down}-${PlayerAnimationTypes.Idle}`,
            frameModel: name,
            frames: [1],
            frameRate: 10,
            repeat: 1,
        },
        {
            key: `${name}-${PlayerAnimationDirections.Left}-${PlayerAnimationTypes.Idle}`,
            frameModel: name,
            frames: [4],
            frameRate: 10,
            repeat: 1,
        },
        {
            key: `${name}-${PlayerAnimationDirections.Right}-${PlayerAnimationTypes.Idle}`,
            frameModel: name,
            frames: [7],
            frameRate: 10,
            repeat: 1,
        },
        {
            key: `${name}-${PlayerAnimationDirections.Up}-${PlayerAnimationTypes.Idle}`,
            frameModel: name,
            frames: [10],
            frameRate: 10,
            repeat: 1,
        },
    ];
}
