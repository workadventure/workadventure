import CancelablePromise from "cancelable-promise";
import { inExternalServiceStore } from "../../Stores/MyMediaStore";
import { jitsiFactory } from "../JitsiFactory";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

export class JitsiCoWebsite extends SimpleCoWebsite {
    private jitsiLoadPromise?: () => CancelablePromise<HTMLIFrameElement>;

    setJitsiLoadPromise(promise: () => CancelablePromise<HTMLIFrameElement>): void {
        this.jitsiLoadPromise = promise;
    }

    load(): CancelablePromise<HTMLIFrameElement> {
        return new CancelablePromise((resolve, reject, cancel) => {
            this.state.set("loading");

            inExternalServiceStore.set(true);

            if (!this.jitsiLoadPromise) {
                return reject("Undefined Jitsi start callback");
            }

            const jitsiLoading = this.jitsiLoadPromise()
                .then((iframe) => {
                    this.iframe = iframe;
                    this.iframe.classList.add("pixel");
                    this.state.set("ready");
                    return resolve(iframe);
                })
                .catch((err) => {
                    return reject(err);
                });

            cancel(() => {
                jitsiLoading.cancel();
                this.unload().catch((err) => {
                    console.error("Cannot unload Jitsi co-website while cancel loading", err);
                });
            });
        });
    }

    unload(): Promise<void> {
        jitsiFactory.destroy();
        inExternalServiceStore.set(false);

        return super.unload();
    }
}
