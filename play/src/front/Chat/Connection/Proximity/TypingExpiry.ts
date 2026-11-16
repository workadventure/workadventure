/** A typing user who sent no new "typing" signal for this long is dropped: a lost "stop" must not stick forever. */
export const TYPING_EXPIRY_MS = 12_000;

/** One timer per typing user, restarted by each "typing" signal; `onExpire` runs when a user went quiet. */
export class TypingExpiry {
    private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

    constructor(private readonly onExpire: (id: string) => void) {}

    refresh(id: string): void {
        this.forget(id);
        this.timers.set(
            id,
            setTimeout(() => {
                this.timers.delete(id);
                this.onExpire(id);
            }, TYPING_EXPIRY_MS),
        );
    }

    forget(id: string): void {
        clearTimeout(this.timers.get(id));
        this.timers.delete(id);
    }

    clear(): void {
        this.timers.forEach((timer) => clearTimeout(timer));
        this.timers.clear();
    }
}
