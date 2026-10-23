export class _ServiceWorker {
    constructor() {
        if ("serviceWorker" in navigator) {
            if (navigator.storage && navigator.storage.persist) {
                navigator.storage
                    .persist()
                    .then((persistent) => {
                        if (persistent) {
                            console.info("Storage will not be cleared except by explicit user action");
                        } else {
                            console.info("Storage may be cleared by the UA under storage pressure.");
                        }
                    })
                    .catch((err) => console.error("_ServiceWorker => err", err));
            }
            this.init();
        }
    }

    init() {
        navigator.serviceWorker
            .register(
                `/service-worker-prod.js?playUri=${window.location.protocol}//${window.location.host}${window.location.pathname}`,
            )
            .then((serviceWorker) => {
                console.info("Service Worker registered: ", serviceWorker);
            })
            .catch((error) => {
                console.error("Error registering the Service Worker: ", error);
            });
    }
}
