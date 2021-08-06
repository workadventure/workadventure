export class _ServiceWorker {
    constructor() {
        if ("serviceWorker" in navigator) {
            this.init();
        }
    }

    init() {
        navigator.serviceWorker
            .register("/service-worker.js")
            .then((serviceWorker) => {
                console.info("Service Worker registered: ", serviceWorker);
            })
            .catch((error) => {
                console.error("Error registering the Service Worker: ", error);
            });
    }
}
