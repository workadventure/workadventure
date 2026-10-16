/*
 * Matrix authenticated media (MSC3916 / Matrix spec v1.11) support.
 *
 * Authenticated media is served from `/_matrix/client/v1/media/...` and requires
 * an `Authorization: Bearer <access_token>` header. DOM elements (`<img>`,
 * `<audio>`, `<video>`, download links) cannot send that header, so this service
 * worker intercepts those requests and re-issues them with the header.
 *
 * The access token is never stored here: it is requested live from a window
 * client on demand (so token refreshes on the page are always honoured) and only
 * cached in-memory for a short time. If no token is available, or the homeserver
 * origin does not match, the request is passed through unchanged so behaviour is
 * never worse than without this worker.
 *
 * This file is loaded via `importScripts` from `service-worker-dev.js` and
 * `service-worker-prod.js`; it only adds listeners and never calls
 * `event.respondWith` for non-Matrix-media requests.
 */
(function () {
    "use strict";

    var AUTHENTICATED_MEDIA_PATH = "/_matrix/client/v1/media/";
    var CONFIG_REQUEST_TYPE = "matrix-media-auth:get-config";
    var CONFIG_TTL_MS = 30000;
    var CLIENT_REPLY_TIMEOUT_MS = 1500;

    // { accessToken, homeserverOrigin, fetchedAt } — short-lived in-memory cache only.
    var cachedConfig = null;

    self.addEventListener("install", function () {
        // Take over as soon as possible so authenticated media works without a reload.
        self.skipWaiting();
    });

    self.addEventListener("activate", function (event) {
        event.waitUntil(self.clients.claim());
    });

    self.addEventListener("fetch", function (event) {
        var request = event.request;
        if (request.method !== "GET") {
            return;
        }
        var url;
        try {
            url = new URL(request.url);
        } catch (e) {
            return;
        }
        if (url.pathname.indexOf(AUTHENTICATED_MEDIA_PATH) === -1) {
            return;
        }
        event.respondWith(handleAuthenticatedMediaRequest(request, url));
    });

    function handleAuthenticatedMediaRequest(request, url) {
        return getConfig(false)
            .then(function (config) {
                if (!isUsableConfig(config, url)) {
                    // Not our homeserver, or no token available: leave the request untouched.
                    return fetch(request);
                }
                return authenticatedFetch(request, config.accessToken).then(function (response) {
                    if (response.status !== 401 && response.status !== 403) {
                        return response;
                    }
                    // The cached token may be stale (refreshed on the page): retry once with a fresh one.
                    return getConfig(true).then(function (freshConfig) {
                        if (
                            isUsableConfig(freshConfig, url) &&
                            freshConfig.accessToken !== config.accessToken
                        ) {
                            return authenticatedFetch(request, freshConfig.accessToken);
                        }
                        return response;
                    });
                });
            })
            .catch(function () {
                // Any unexpected failure must not be worse than the default behaviour.
                return fetch(request);
            });
    }

    function isUsableConfig(config, url) {
        if (!config || !config.accessToken) {
            return false;
        }
        if (config.homeserverOrigin && url.origin !== config.homeserverOrigin) {
            return false;
        }
        return true;
    }

    function authenticatedFetch(request, accessToken) {
        var headers = new Headers();
        headers.set("Authorization", "Bearer " + accessToken);
        var range = request.headers.get("range");
        if (range) {
            // Preserve range requests so audio/video seeking keeps working.
            headers.set("Range", range);
        }
        return fetch(request.url, {
            method: "GET",
            headers: headers,
            mode: "cors",
            credentials: "omit",
            redirect: "follow",
        }).catch(function () {
            // CORS / network error: fall back to the original request rather than an error page.
            return fetch(request);
        });
    }

    function getConfig(forceRefresh) {
        if (!forceRefresh && cachedConfig && Date.now() - cachedConfig.fetchedAt < CONFIG_TTL_MS) {
            return Promise.resolve(cachedConfig);
        }
        return requestConfigFromClients().then(function (config) {
            if (config && config.accessToken) {
                cachedConfig = {
                    accessToken: config.accessToken,
                    homeserverOrigin: config.homeserverOrigin || null,
                    fetchedAt: Date.now(),
                };
                return cachedConfig;
            }
            return config || cachedConfig;
        });
    }

    function requestConfigFromClients() {
        return self.clients
            .matchAll({ type: "window", includeUncontrolled: true })
            .then(function (clients) {
                return requestConfigFromFirstResponder(clients, 0);
            });
    }

    function requestConfigFromFirstResponder(clients, index) {
        if (index >= clients.length) {
            return Promise.resolve(null);
        }
        return requestConfigFromClient(clients[index]).then(function (config) {
            if (config && config.accessToken) {
                return config;
            }
            return requestConfigFromFirstResponder(clients, index + 1);
        });
    }

    function requestConfigFromClient(client) {
        return new Promise(function (resolve) {
            var channel = new MessageChannel();
            var settled = false;
            var timer = setTimeout(function () {
                finish(null);
            }, CLIENT_REPLY_TIMEOUT_MS);

            function finish(value) {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timer);
                channel.port1.onmessage = null;
                try {
                    channel.port1.close();
                } catch (e) {
                    /* noop */
                }
                resolve(value);
            }

            channel.port1.onmessage = function (event) {
                finish(event.data || null);
            };

            try {
                client.postMessage({ type: CONFIG_REQUEST_TYPE }, [channel.port2]);
            } catch (e) {
                finish(null);
            }
        });
    }
})();
