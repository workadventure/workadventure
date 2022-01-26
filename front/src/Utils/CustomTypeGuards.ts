import type { OutlineableInterface } from '../Phaser/Game/OutlineableInterface';

export function isOutlineable(object: unknown): object is OutlineableInterface {
    return (object as unknown as OutlineableInterface)?.getObjectToOutline() !== undefined;
}