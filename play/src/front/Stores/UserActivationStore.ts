import { Deferred } from "@workadventure/shared-utils";

export class UserActivationManager {
    private activationDeferred = new Deferred<void>();
    private activated = false;
    private activationCheckIntervalId: ReturnType<typeof setInterval> | undefined;

    private supportsActivation() {
        if (typeof navigator === "undefined") {
            return false;
        }

        return "userActivation" in navigator;
    }

    private hasBeenActivated() {
        return this.activated || (this.supportsActivation() && navigator.userActivation.hasBeenActive);
    }

    private startPollingActivation() {
        if (this.activationCheckIntervalId !== undefined || !this.supportsActivation()) {
            return;
        }

        this.activationCheckIntervalId = setInterval(() => {
            if (!navigator.userActivation.hasBeenActive) {
                return;
            }

            this.resolveActivation();
        }, 500);
    }

    private resolveActivation() {
        if (this.activated) {
            return;
        }

        this.activated = true;
        if (this.activationCheckIntervalId !== undefined) {
            clearInterval(this.activationCheckIntervalId);
            this.activationCheckIntervalId = undefined;
        }
        this.activationDeferred.resolve();
    }

    /**
     * This function returns a promise that resolves when the user has activated the page
     * (by clicking or pressing a key). If the page is already activated, the promise
     * resolves immediately. If the browser does not support user activation detection,
     * the promise resolves immediately.
     */
    public async waitForUserActivation(): Promise<void> {
        if (!this.supportsActivation()) {
            return;
        }

        if (this.hasBeenActivated()) {
            this.resolveActivation();
            return;
        }

        this.startPollingActivation();
        return this.activationDeferred.promise;
    }

    /**
     * Call this function as soon as the user interacts with the page (click, keypress, etc.)
     * to notify that the user has activated the page.
     */
    public notifyUserActivation() {
        if (this.activated) {
            return;
        }

        this.resolveActivation();
    }
}

export const userActivationManager = new UserActivationManager();
