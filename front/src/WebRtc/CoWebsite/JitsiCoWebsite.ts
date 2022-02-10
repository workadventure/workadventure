import CancelablePromise from "cancelable-promise";
import { gameManager } from "../../Phaser/Game/GameManager";
import { coWebsiteManager } from "../CoWebsiteManager";
import { jitsiFactory } from "../JitsiFactory";
import { SimpleCoWebsite } from "./SimpleCoWebsite";

export class JitsiCoWebsite extends SimpleCoWebsite {
    private jitsiLoadPromise?: () => CancelablePromise<HTMLIFrameElement>;

    constructor(url: URL, allowApi?: boolean, allowPolicy?: string, widthPercent?: number, closable?: boolean) {
        const coWebsite = coWebsiteManager.searchJitsi();

        if (coWebsite) {
            coWebsiteManager.closeCoWebsite(coWebsite);
        }

        super(url, allowApi, allowPolicy, widthPercent, closable);
    }

    setJitsiLoadPromise(promise: () => CancelablePromise<HTMLIFrameElement>): void {
        this.jitsiLoadPromise = promise;
    }

    load(): CancelablePromise<HTMLIFrameElement> {
        return new CancelablePromise((resolve, reject, cancel) => {
            this.state.set("loading");

            gameManager.getCurrentGameScene().disableMediaBehaviors();
            jitsiFactory.restart();

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
        gameManager.getCurrentGameScene().enableMediaBehaviors();

        return super.unload();
    }
}
