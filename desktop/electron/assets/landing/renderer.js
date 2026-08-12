(function () {
    "use strict";

    var api = window.WAD && window.WAD.navigation;
    if (!api) {
        console.error("Landing renderer: WAD.navigation not exposed");
        return;
    }

    var page = document.getElementById("page");
    var form = document.getElementById("join-form");
    var input = document.getElementById("world-url");
    var joinBtn = document.getElementById("join-btn");
    var createBtn = document.getElementById("create-btn");
    var errorEl = document.getElementById("join-error");
    var createErrorEl = document.getElementById("create-error");
    var recentSection = document.getElementById("recent");
    var worldRow = document.getElementById("world-row");
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

    // Star (filled = pinned, outline = not). Inline SVG so the sandboxed page needs no assets.
    function pinIconSvg(filled) {
        return (
            '<svg viewBox="0 0 24 24" width="15" height="15" fill="' +
            (filled ? "currentColor" : "none") +
            '" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
            '<path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z"/></svg>'
        );
    }

    // No map image exists for an arbitrary world, so each tile gets a stable look derived from its
    // URL: same world, same colour and grid offset on every launch, and two worlds are very
    // unlikely to collide. Cheap stand-in for the real art, and it never leaves a card blank.
    function hashString(value) {
        var hash = 0;
        for (var i = 0; i < value.length; i++) {
            hash = (hash << 5) - hash + value.charCodeAt(i);
            hash |= 0;
        }
        return Math.abs(hash);
    }

    function buildWorldCard(world) {
        var card = document.createElement("button");
        card.type = "button";
        card.className = "world";
        card.title = world.url;

        var hash = hashString(world.url);
        var art = document.createElement("span");
        art.className = "world-art";
        art.style.setProperty("--h", String(hash % 360));
        art.style.setProperty("--ox", (hash % 26) + "px");
        art.style.setProperty("--oy", ((hash >> 5) % 26) + "px");
        card.appendChild(art);

        var scrim = document.createElement("span");
        scrim.className = "world-scrim";
        card.appendChild(scrim);

        var copy = document.createElement("span");
        copy.className = "world-copy";
        var name = document.createElement("span");
        name.className = "world-name";
        name.textContent = world.label;
        var url = document.createElement("span");
        url.className = "world-url";
        url.textContent = world.url;
        copy.appendChild(name);
        copy.appendChild(url);
        card.appendChild(copy);

        var hover = document.createElement("span");
        hover.className = "world-hover";
        // Label and chevron share a row of their own so they centre against EACH OTHER. Left as
        // direct children of the band they would both align to its bottom edge, which lines the
        // chevron up with the text's line box (28px tall) rather than with the letters.
        var hoverRow = document.createElement("span");
        hoverRow.className = "world-hover-row";
        var hoverLabel = document.createElement("span");
        hoverLabel.textContent = "Explore";
        hoverRow.appendChild(hoverLabel);
        // 6x12 chevron with a 2px stroke, per the design. The path spans x=1..5 so the stroke's
        // 1px half-width lands exactly on the viewBox edges instead of being clipped.
        hoverRow.insertAdjacentHTML(
            "beforeend",
            '<svg viewBox="0 0 6 12" fill="none" stroke="currentColor" stroke-width="2" ' +
                'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
                '<path d="M1 1l4 5l-4 5"/></svg>'
        );
        hover.appendChild(hoverRow);
        card.appendChild(hover);

        card.addEventListener("click", function () {
            showError(recentErrorEl, "");
            setWorldsBusy(true);
            // Only the label changes — writing to `hover` itself would wipe the chevron.
            hoverLabel.textContent = "Opening…";
            api.joinWorld(world.url)
                .then(function (result) {
                    if (!result || !result.ok) {
                        throw new Error((result && result.error) || "Failed to join world.");
                    }
                })
                .catch(function (err) {
                    console.warn("landing.joinWorld rejected", err);
                    showError(recentErrorEl, (err && err.message) || "Failed to join world.");
                    setWorldsBusy(false);
                    hoverLabel.textContent = "Explore";
                });
        });

        return card;
    }

    function setWorldsBusy(busy) {
        Array.prototype.forEach.call(worldRow.querySelectorAll("button"), function (btn) {
            btn.disabled = busy;
        });
    }

    // The pin sits OUTSIDE the tile button (a button cannot nest inside a button) and is layered
    // over it, so it stays clickable without opening the world.
    function buildPin(world) {
        var pin = document.createElement("button");
        pin.type = "button";
        pin.className = "world-pin" + (world.pinned ? " is-pinned" : "");
        pin.setAttribute("aria-label", world.pinned ? "Unpin world" : "Pin world");
        pin.title = world.pinned ? "Unpin" : "Pin";
        pin.innerHTML = pinIconSvg(Boolean(world.pinned));
        pin.addEventListener("click", function (event) {
            event.stopPropagation();
            api.togglePin(world.url)
                .then(function () {
                    refreshWorlds();
                })
                .catch(function (err) {
                    console.warn("landing.togglePin rejected", err);
                });
        });
        return pin;
    }

    function isWorld(world) {
        return world && typeof world.url === "string" && typeof world.label === "string";
    }

    // Pinned worlds lead the row, then the rest in recency order; a pinned world must not appear
    // twice when it is also recent.
    function mergeWorlds(pinned, recent) {
        var seen = Object.create(null);
        var merged = [];
        function push(world, forcePinned) {
            if (!isWorld(world) || seen[world.url]) {
                return;
            }
            seen[world.url] = true;
            merged.push({ url: world.url, label: world.label, pinned: forcePinned || Boolean(world.pinned) });
        }
        (Array.isArray(pinned) ? pinned : []).forEach(function (world) {
            push(world, true);
        });
        (Array.isArray(recent) ? recent : []).forEach(function (world) {
            push(world, false);
        });
        return merged;
    }

    function renderWorlds(worlds) {
        worldRow.textContent = "";
        worlds.forEach(function (world) {
            var wrap = document.createElement("div");
            wrap.style.position = "relative";
            wrap.style.flex = "0 0 auto";
            wrap.appendChild(buildWorldCard(world));
            if (typeof api.togglePin === "function") {
                wrap.appendChild(buildPin(world));
            }
            worldRow.appendChild(wrap);
        });
        var hasWorlds = worlds.length > 0;
        recentSection.toggleAttribute("hidden", !hasWorlds);
        // Drives the two layouts (top-left vs centred) from a single source of truth.
        page.dataset.state = hasWorlds ? "has-worlds" : "empty";
    }

    function refreshWorlds() {
        var getRecent =
            typeof api.getRecentWorlds === "function" ? api.getRecentWorlds() : Promise.resolve([]);
        var getPinned =
            typeof api.getPinnedWorlds === "function" ? api.getPinnedWorlds() : Promise.resolve([]);
        Promise.all([getPinned, getRecent])
            .then(function (results) {
                renderWorlds(mergeWorlds(results[0], results[1]));
            })
            .catch(function (err) {
                console.warn("landing: failed to load worlds", err);
                renderWorlds([]);
            });
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
        joinBtn.textContent = "Opening…";
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

    refreshWorlds();

    // Autofocus the URL field so the user can just paste and hit Enter.
    setTimeout(function () {
        input.focus();
    }, 50);
})();
