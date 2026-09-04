import type { OutlineableInterface } from "../Phaser/Game/OutlineableInterface";

export function isOutlineable(object: unknown): object is OutlineableInterface {
    return (object as OutlineableInterface)?.pointerOverOutline !== undefined;
}
/**
 * Make sure Typescript does not complain about "any" type when iterating through object's properties
 * Trick explained here:
 * https://stackoverflow.com/questions/66372307/simplest-way-to-iterate-over-an-object-when-using-typescript
 * */
export function assertObjectKeys<T extends object>(obj: T): (keyof T)[] {
    return Object.keys(obj) as Array<keyof T>;
}

/**
 * Guard so a game shortcut does not fire while the user is typing: the key must keep its normal
 * text-input behaviour in text fields and contenteditable elements.
 */
export function isTypingTarget(target: EventTarget | null): boolean {
    return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement ||
        // isContentEditable covers nested nodes; the attribute check is the jsdom fallback (jsdom does
        // not implement isContentEditable).
        (target instanceof HTMLElement && (target.isContentEditable || target.contentEditable === "true"))
    );
}
