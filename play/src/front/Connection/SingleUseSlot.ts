/**
 * A slot holding one in-flight piece of work for one room, handed over exactly once.
 *
 * Every rule here exists because breaking it is invisible at the time and expensive later:
 *
 * - **Handed over once.** A scene re-created on a portal, a room change or a reconnection must
 *   build its own; replaying a previous boot's work would attach it to a room it is no longer in.
 * - **Matched on the room.** A slot filled for another room is not ours to take.
 * - **Replacing discards.** Filling a slot that still holds something means the boot that put it
 *   there never reached a scene. That content is stale, and the `onDiscard` hook is what closes
 *   whatever it was holding open.
 */
export class SingleUseSlot<T> {
    private held: { roomUrl: string; value: T } | undefined;

    constructor(private readonly onDiscard: (value: T) => void) {}

    public fill(roomUrl: string, value: T): void {
        this.discard();
        this.held = { roomUrl, value };
    }

    public take(roomUrl: string): T | undefined {
        if (this.held?.roomUrl !== roomUrl) {
            return undefined;
        }
        const { value } = this.held;
        this.held = undefined;
        return value;
    }

    /** Read without taking — for a second reader that must not deprive the one it is preparing for. */
    public peek(): T | undefined {
        return this.held?.value;
    }

    public discard(): void {
        const stale = this.held;
        this.held = undefined;
        if (stale) {
            this.onDiscard(stale.value);
        }
    }
}
