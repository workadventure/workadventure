import { Deferred } from "ts-deferred";
import * as Sentry from "@sentry/svelte";

class UserActivationManager {
    private activationDeferred = new Deferred<void>();

    private supportsActivation() {
        return "userActivation" in navigator;
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
        if (navigator.userActivation.hasBeenActive) {
            return;
        }

        return this.activationDeferred.promise;
    }

    /**
     * Call this function as soon as the user interacts with the page (click, keypress, etc.)
     * to notify that the user has activated the page.
     */
    public notifyUserActivation() {
        if (this.supportsActivation() && !navigator.userActivation.hasBeenActive) {
            console.error("notifyUserActivation called but userActivation.hasBeenActive is false");
            Sentry.captureMessage("notifyUserActivation called but userActivation.hasBeenActive is false");
        }

        this.activationDeferred.resolve();
    }
}

export const userActivationManager = new UserActivationManager();
