/**
 * This class can create a lock by key
 * to prevent async issues
 */
export class LockByKey<T> {
    private locks = new Map<T, Promise<void>>();

    public async waitForLock(key: T, callback: () => Promise<void>): Promise<void> {
        let lockPromise = this.locks.get(key);

        try {
            if (lockPromise) {
                await lockPromise;
            }
        } catch {
            /* empty */
        }

        lockPromise = callback();

        this.locks.set(key, lockPromise);

        try {
            await lockPromise;
        } finally {
            if (this.locks.get(key) === lockPromise) {
                this.locks.delete(key);
            }
        }
    }
}
