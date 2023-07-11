/**
 * A utility function to introduce a random delay in the code.
 * Use this when debugging race conditions.
 * Put it after "await" or inside "then()" callback.
 * This will give a chance of reordering the execution of the callbacks and my help you find race conditions.
 *
 * This function is only called if the localStorage variable "randomDelay" is set.
 *
 * In the console use:
 *
 * window.localStorage.setItem("randomDelay", "true")
 */
export function randomDelay(lowLimit = 100, highLimit = 2000): Promise<void> {
    const randomDelay = window.localStorage.getItem("randomDelay");

    if (!randomDelay) {
        return Promise.resolve();
    }

    // Choose a random time to wait
    const waitTime = Math.random() * (highLimit - lowLimit) + lowLimit;

    return new Promise<void>((resolve) => {
        setTimeout(() => {
            console.log("Introduced random delay. Resolving after ", waitTime);
            resolve();
        }, waitTime);
    });
}
