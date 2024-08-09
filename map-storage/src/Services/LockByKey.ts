/**
 * This class can create a lock by key
 * to prevent async issues
 */
export class LockByKey<T> {
    private locks = new Map<T, Promise<void>>();

    public async waitForLock(key: T, callback: () => Promise<void>): Promise<void> {
        let lockPromise = this.locks.get(key);

        if (lockPromise) {
            await lockPromise;
        }

        lockPromise = callback();

        this.locks.set(key, lockPromise);
        await lockPromise;
        if (this.locks.get(key) === lockPromise) {
            this.locks.delete(key);
        }
    }
}
