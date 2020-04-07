import {AnimationData} from "../Interfaces/AnimationData";
import {getPlayerAnimations} from "../Entities/Player";

export const getAllAnimationsData = (): AnimationData[] => {
    return [
        ...getPlayerAnimations()
    ]
};

export const manageCaracterWalkAnimation = (caracter: Phaser.GameObjects.Sprite, direction: string) => {
    if (!caracter.anims.currentAnim || caracter.anims.currentAnim.key !== direction) {
        caracter.anims.play(direction);
    } else if (direction === 'none' && caracter.anims.currentAnim) {
        caracter.anims.currentAnim.destroy();
    }
}