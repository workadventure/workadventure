(function () {
    "use strict";

    var api = window.WAD && window.WAD.navigation;
    if (!api) {
        console.error("Landing renderer: WAD.navigation not exposed");
        return;
    }

    var form = document.getElementById("join-form");
    var input = document.getElementById("world-url");
    var joinBtn = document.getElementById("join-btn");
    var createBtn = document.getElementById("create-btn");
    var errorEl = document.getElementById("join-error");
    var createErrorEl = document.getElementById("create-error");
    var recentSection = document.getElementById("recent-worlds");
    var recentList = document.getElementById("recent-list");
    var recentErrorEl = document.getElementById("recent-error");

    function showError(element, message) {
        element.textContent = message || "";
        element.classList.toggle("visible", Boolean(message));
    }

    // If the main process bounced us back here after a failed navigation, it passed a message
    // via ?error=…. Show it, then strip the query so a refresh doesn't repeat the error.
    try {
        var initialError = new URLSearchParams(window.location.search).get("error");
        if (initialError) {
            showError(errorEl, initialError);
            if (window.history && typeof window.history.replaceState === "function") {
                window.history.replaceState({}, "", window.location.pathname);
            }
        }
    } catch (err) {
        console.warn("Landing renderer: failed to read initial error param", err);
    }

    function renderRecentWorlds(worlds) {
        if (!Array.isArray(worlds) || worlds.length === 0) {
            return;
        }

        worlds.forEach(function (world) {
            if (!world || typeof world.url !== "string" || typeof world.label !== "string") {
                return;
            }

            var button = document.createElement("button");
            button.type = "button";
            button.className = "recent-item";
            button.title = world.url;

            var copy = document.createElement("span");
            copy.className = "recent-copy";
            var name = document.createElement("span");
            name.className = "recent-name";
            name.textContent = world.label;
            var url = document.createElement("span");
            url.className = "recent-url";
            url.textContent = world.url;
            copy.appendChild(name);
            copy.appendChild(url);

            var action = document.createElement("span");
            action.className = "recent-action";
            action.textContent = "Open";
            button.appendChild(copy);
            button.appendChild(action);

            button.addEventListener("click", function () {
                showError(recentErrorEl, "");
                Array.prototype.forEach.call(recentList.querySelectorAll("button"), function (item) {
                    item.setAttribute("disabled", "disabled");
                });
                action.textContent = "Opening...";
                api.joinWorld(world.url)
                    .then(function (result) {
                        if (!result || !result.ok) {
                            throw new Error((result && result.error) || "Failed to join world.");
                        }
                    })
                    .catch(function (err) {
                        console.warn("landing.recentWorld rejected", err);
                        showError(recentErrorEl, (err && err.message) || "Failed to join world.");
                        Array.prototype.forEach.call(recentList.querySelectorAll("button"), function (item) {
                            item.removeAttribute("disabled");
                        });
                        action.textContent = "Open";
                    });
            });

            recentList.appendChild(button);
        });

        if (recentList.childElementCount > 0) {
            recentSection.removeAttribute("hidden");
        }
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();
        var url = (input.value || "").trim();
        if (!url) {
            showError(errorEl, "Please enter a world URL.");
            input.focus();
            return;
        }
        showError(errorEl, "");
        joinBtn.setAttribute("disabled", "disabled");
        joinBtn.textContent = "Opening...";
        api.joinWorld(url)
            .then(function (result) {
                if (!result || !result.ok) {
                    showError(errorEl, (result && result.error) || "Failed to join world.");
                    joinBtn.removeAttribute("disabled");
                    joinBtn.textContent = "Open world";
                }
            })
            .catch(function (err) {
                console.warn("landing.joinWorld rejected", err);
                showError(errorEl, (err && err.message) || "Failed to join world.");
                joinBtn.removeAttribute("disabled");
                joinBtn.textContent = "Open world";
            });
    });

    createBtn.addEventListener("click", function () {
        showError(createErrorEl, "");
        createBtn.setAttribute("disabled", "disabled");
        api.openAdminSignup()
            .then(function (result) {
                if (!result || !result.ok) {
                    showError(createErrorEl, (result && result.error) || "The signup page could not be opened.");
                }
            })
            .catch(function (err) {
                console.warn("landing.openAdminSignup rejected", err);
                showError(createErrorEl, (err && err.message) || "The signup page could not be opened.");
            })
            .finally(function () {
                setTimeout(function () {
                    createBtn.removeAttribute("disabled");
                }, 500);
            });
    });

    if (typeof api.getRecentWorlds === "function") {
        api.getRecentWorlds()
            .then(renderRecentWorlds)
            .catch(function (err) {
                console.warn("landing.getRecentWorlds rejected", err);
            });
    }

    // Autofocus the URL field so the user can just paste and hit Enter.
    setTimeout(function () {
        input.focus();
    }, 50);
})();
