import type { OutlineConfig } from '../../Utils/OutlineManager';

export interface OutlineableInterface {
    getObjectToOutline: () => Phaser.GameObjects.GameObject;
    getOutlineConfig: () => OutlineConfig;
}