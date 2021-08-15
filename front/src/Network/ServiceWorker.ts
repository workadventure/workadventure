import { NODE_ENV } from "../Enum/EnvironmentVariable";

export class _ServiceWorker {
    constructor() {
        if ("serviceWorker" in navigator) {
            this.init();
        }
    }

    init() {
        //Check node env and if is development, use service worker dev file
        if (NODE_ENV === "development") {
            navigator.serviceWorker
                .register("/service-worker-dev.js")
                .then((serviceWorker) => {
                    console.info("Service Worker registered: ", serviceWorker);
                })
                .catch((error) => {
                    console.error("Error registering the Service Worker: ", error);
                });
            return;
        }
        navigator.serviceWorker
            .register("/service-worker-prod.js")
            .then((serviceWorker) => {
                console.info("Service Worker registered: ", serviceWorker);
            })
            .catch((error) => {
                console.error("Error registering the Service Worker: ", error);
            });
    }
}
