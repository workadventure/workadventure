const test = require("node:test");
const assert = require("node:assert/strict");

const {
    addWorldToHistory,
    createDesktopConfig,
    createDesktopLoginUrl,
    createDesktopLogoutUrl,
    createRoomUrlWithAuthToken,
    extractDesktopAuthCallback,
    formatWorldHistoryLabel,
    isAllowedNavigationUrl,
    isDesktopLoginUrl,
    isDesktopLogoutUrl,
    isRoomUrl,
    normalizePersistedLastRoomUrl,
    normalizePersistedWorldHistory,
    normalizePersistedPortalUrl,
    redactSensitiveString,
    resolveInitialTarget,
    stripSensitiveQueryParams,
    validateDesktopNavigationUrl,
} = require("./desktop-url-policy");

function withNodeEnv(value, fn) {
    const previous = process.env.NODE_ENV;
    if (value === undefined) {
        delete process.env.NODE_ENV;
    } else {
        process.env.NODE_ENV = value;
    }
    try {
        fn();
    } finally {
        if (previous === undefined) {
            delete process.env.NODE_ENV;
        } else {
            process.env.NODE_ENV = previous;
        }
    }
}

test("allows the configured portal origin and WorkAdventure host suffixes only", () => {
    const config = createDesktopConfig({
        portalUrl: "https://play.workadventu.re",
        allowedOrigins: [],
        allowedHostSuffixes: [".workadventu.re", ".workadventure.fr"],
    });

    assert.equal(isAllowedNavigationUrl("https://play.workadventu.re/@/team/world/room", config), true);
    assert.equal(isAllowedNavigationUrl("https://maps.workadventure.fr/some-map.json", config), true);
    assert.equal(isAllowedNavigationUrl("https://workadventu.re.evil.test/@/team/world/room", config), false);
    assert.equal(isAllowedNavigationUrl("javascript:alert(1)", config), false);
});

test("resolves launch target from deep link, then last room, then portal", () => {
    const config = createDesktopConfig({
        portalUrl: "https://play.workadventu.re",
        allowedOrigins: [],
        allowedHostSuffixes: [".workadventu.re"],
    });

    assert.equal(
        resolveInitialTarget(config, {
            pendingDeepLinkUrl: "https://play.workadventu.re/@/deep/world/room",
            lastRoomUrl: "https://play.workadventu.re/@/last/world/room",
        }),
        "https://play.workadventu.re/@/deep/world/room"
    );

    assert.equal(
        resolveInitialTarget(config, {
            pendingDeepLinkUrl: "https://evil.test/@/deep/world/room",
            lastRoomUrl: "https://play.workadventu.re/@/last/world/room",
        }),
        "https://play.workadventu.re/@/last/world/room"
    );

    assert.equal(resolveInitialTarget(config, {}), "https://play.workadventu.re/");
});

test("validates and normalizes world URLs entered in the desktop navigation UI", () => {
    const config = createDesktopConfig({
        portalUrl: "https://admin.workadventu.re",
        allowedOrigins: [],
        allowedHostSuffixes: [".workadventu.re"],
    });

    assert.deepEqual(validateDesktopNavigationUrl("", config), {
        ok: false,
        error: "Please enter a world URL.",
    });
    assert.deepEqual(validateDesktopNavigationUrl("play.workadventu.re/@/team/world/room", config), {
        ok: false,
        error: "Invalid URL. Please enter a full http(s):// world URL.",
    });
    assert.deepEqual(validateDesktopNavigationUrl("workadventure://join", config), {
        ok: false,
        error: "Only http(s):// URLs are supported.",
    });
    assert.deepEqual(
        validateDesktopNavigationUrl("https://user:secret@play.workadventu.re/@/team/world/room", config),
        {
            ok: false,
            error: "Invalid URL — missing host or contains credentials.",
        }
    );
    assert.equal(validateDesktopNavigationUrl("https://evil.test/@/team/world/room", config).ok, false);
    assert.deepEqual(validateDesktopNavigationUrl(" https://play.workadventu.re/@/team/world/room ", config), {
        ok: true,
        url: "https://play.workadventu.re/@/team/world/room",
    });
});

test("uses the local admin world picker as the default portal (prod defaults exclude .workadventure.localhost)", () => {
    withNodeEnv("production", () => {
        const config = createDesktopConfig({});

        assert.equal(config.portalUrl, "http://admin.workadventure.localhost/");
        // .workadventure.localhost is intentionally dropped in prod: an attacker on the same
        // LAN can poison DNS for *.workadventure.localhost and serve a fake /desktop-auth/exchange.
        assert.deepEqual(config.allowedHostSuffixes, [".workadventu.re", ".workadventure.fr"]);
    });
});

test("keeps .workadventure.localhost in dev defaults for local development", () => {
    withNodeEnv("development", () => {
        const config = createDesktopConfig({});
        assert.deepEqual(config.allowedHostSuffixes, [
            ".workadventu.re",
            ".workadventure.fr",
            ".workadventure.localhost",
        ]);
    });
});

test("normalises configured allow-list entries to dot-prefixed form", () => {
    const config = createDesktopConfig({
        allowedHostSuffixes: ["workadventu.re", "  WORKADVENTURE.fr  "],
    });
    assert.deepEqual(config.allowedHostSuffixes, [".workadventu.re", ".workadventure.fr"]);
});

test("rejects sibling hostnames sharing the suffix string without dot boundary", () => {
    const config = createDesktopConfig({
        portalUrl: "https://play.workadventu.re",
        allowedHostSuffixes: ["workadventu.re"],
    });
    assert.equal(isAllowedNavigationUrl("https://play.workadventu.re/@/team/world/room", config), true);
    assert.equal(isAllowedNavigationUrl("https://workadventu.re/", config), true);
    // The classic endsWith-without-dot bug: evilworkadventu.re should NOT match workadventu.re.
    assert.equal(isAllowedNavigationUrl("https://evilworkadventu.re/", config), false);
    assert.equal(isAllowedNavigationUrl("https://attacker.evilworkadventu.re/", config), false);
});

test("blocks http:// outside development for non-loopback hosts", () => {
    withNodeEnv("production", () => {
        const config = createDesktopConfig({
            portalUrl: "https://play.workadventu.re",
            allowedHostSuffixes: ["workadventu.re"],
        });
        assert.equal(isAllowedNavigationUrl("http://play.workadventu.re/@/team/world/room", config), false);
        assert.equal(isAllowedNavigationUrl("https://play.workadventu.re/@/team/world/room", config), true);
        // Loopback over http stays allowed because the loopback OAuth callback server is local.
        assert.equal(
            isAllowedNavigationUrl("http://127.0.0.1:12345/", {
                ...config,
                allowedOrigins: ["http://127.0.0.1:12345"],
            }),
            true
        );
    });
});

test("allows http:// in development for any allow-listed host", () => {
    withNodeEnv("development", () => {
        const config = createDesktopConfig({
            portalUrl: "http://admin.workadventure.localhost/",
        });
        assert.equal(isAllowedNavigationUrl("http://play.workadventure.localhost/_/global/maps", config), true);
    });
});

test("migrates the previous broken local hosted map URL from persisted settings to the admin portal", () => {
    const brokenLocalMapUrl = "https://play.workadventure.localhost/~/maps/areas.wam";

    assert.equal(normalizePersistedPortalUrl(brokenLocalMapUrl), "http://admin.workadventure.localhost/");
    assert.equal(normalizePersistedLastRoomUrl(brokenLocalMapUrl), undefined);
});

test("migrates the previous https local global map URL to the admin portal", () => {
    assert.equal(
        normalizePersistedPortalUrl(
            "https://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Areas/StartAreas/start_areas.json"
        ),
        "http://admin.workadventure.localhost/"
    );
});

test("migrates the previous https local global map URL from environment config to the admin portal", () => {
    const config = createDesktopConfig({
        WA_DESKTOP_PORTAL_URL:
            "https://play.workadventure.localhost/_/global/maps.workadventure.localhost/tests/Areas/StartAreas/start_areas.json",
    });

    assert.equal(config.portalUrl, "http://admin.workadventure.localhost/");
});

test("detects WorkAdventure room URLs that are safe to remember", () => {
    assert.equal(isRoomUrl("https://play.workadventu.re/@/team/world/room"), true);
    assert.equal(isRoomUrl("https://play.workadventu.re/_/global/map.example.com/map.json"), true);
    // Admin-managed maps (/~/) and custom map-storage prefixes (/*/) are real WA URL shapes
    // that must land in Recent worlds — previously they were silently dropped.
    assert.equal(isRoomUrl("https://play.workadventu.re/~/maps/lobby.wam"), true);
    assert.equal(isRoomUrl("https://play.workadventu.re/*/global/example.com/map.json"), true);
    assert.equal(isRoomUrl("https://play.workadventu.re/login-screen"), false);
    assert.equal(isRoomUrl("https://play.workadventu.re/"), false);
});

test("normalizePersistedLastRoomUrl strips the URL fragment so hash-only changes don't spawn new entries", () => {
    assert.equal(
        normalizePersistedLastRoomUrl("https://play.workadventu.re/@/team/world/room#chat=1"),
        "https://play.workadventu.re/@/team/world/room"
    );
    assert.equal(
        normalizePersistedLastRoomUrl("https://play.workadventu.re/@/team/world/room?foo=bar#lang=fr"),
        "https://play.workadventu.re/@/team/world/room?foo=bar"
    );
});

test("keeps a sanitized, deduplicated list of recently visited worlds", () => {
    assert.deepEqual(
        normalizePersistedWorldHistory([
            "https://play.workadventu.re/@/team/new/room?token=secret",
            "not-a-url",
            "https://play.workadventu.re/login-screen",
            "https://user:password@play.workadventu.re/@/team/private/room",
            "https://play.workadventu.re/@/team/new/room",
            "https://play.workadventu.re/@/team/old/room",
        ]),
        ["https://play.workadventu.re/@/team/new/room", "https://play.workadventu.re/@/team/old/room"]
    );

    assert.deepEqual(
        addWorldToHistory(
            ["https://play.workadventu.re/@/team/old/room", "https://play.workadventu.re/@/team/current/room"],
            "https://play.workadventu.re/@/team/current/room?code=oauth-code",
            2
        ),
        ["https://play.workadventu.re/@/team/current/room", "https://play.workadventu.re/@/team/old/room"]
    );
});

test("formats readable recent-world labels without exposing the full URL", () => {
    assert.equal(
        formatWorldHistoryLabel("https://play.workadventu.re/@/acme/headquarters/reception"),
        "acme / headquarters / reception"
    );
    assert.equal(
        formatWorldHistoryLabel("https://play.workadventu.re/_/global/maps.example.com/map.json", 22),
        "play.workadventu.re/_…"
    );
});

test("detects and upgrades login-screen URLs for desktop OIDC", () => {
    const loginUrl =
        "https://play.workadventu.re/login-screen?playUri=https%3A%2F%2Fplay.workadventu.re%2F%40%2Fteam%2Fworld%2Froom";

    assert.equal(isDesktopLoginUrl(loginUrl), true);
    assert.equal(createDesktopLoginUrl(loginUrl), `${loginUrl}&desktop=true`);
    assert.equal(createDesktopLoginUrl(`${loginUrl}&desktop=true`), `${loginUrl}&desktop=true`);
});

test("adds a loopback callback URL to desktop login-screen URLs", () => {
    const loginUrl =
        "https://play.workadventu.re/login-screen?playUri=https%3A%2F%2Fplay.workadventu.re%2F%40%2Fteam%2Fworld%2Froom";

    assert.equal(
        createDesktopLoginUrl(loginUrl, "http://127.0.0.1:48919/auth/callback"),
        `${loginUrl}&desktop=true&desktopCallbackUrl=http%3A%2F%2F127.0.0.1%3A48919%2Fauth%2Fcallback`
    );
});

test("detects and upgrades logout URLs for desktop browser flow", () => {
    const logoutUrl =
        "https://play.workadventu.re/logout?playUri=https%3A%2F%2Fplay.workadventu.re%2F%40%2Fteam%2Fworld%2Froom&token=abc";

    assert.equal(isDesktopLogoutUrl(logoutUrl), true);
    assert.equal(createDesktopLogoutUrl(logoutUrl), `${logoutUrl}&desktop=true`);
    assert.equal(createDesktopLogoutUrl(`${logoutUrl}&desktop=true`), `${logoutUrl}&desktop=true`);
});

test("adds a loopback callback URL to desktop logout URLs", () => {
    const logoutUrl =
        "https://play.workadventu.re/logout?playUri=https%3A%2F%2Fplay.workadventu.re%2F%40%2Fteam%2Fworld%2Froom&token=abc";

    assert.equal(
        createDesktopLogoutUrl(logoutUrl, "http://127.0.0.1:48919/logout/callback"),
        `${logoutUrl}&desktop=true&desktopCallbackUrl=http%3A%2F%2F127.0.0.1%3A48919%2Flogout%2Fcallback`
    );
});

test("extracts desktop auth callback origin and one-shot code", () => {
    assert.deepEqual(
        extractDesktopAuthCallback(
            "workadventure://auth/callback?origin=https%3A%2F%2Fplay.workadventu.re&code=abc123"
        ),
        {
            origin: "https://play.workadventu.re",
            code: "abc123",
        }
    );

    assert.equal(
        extractDesktopAuthCallback("workadventure://join?url=https%3A%2F%2Fplay.workadventu.re%2F"),
        undefined
    );
});

test("adds exchanged desktop auth token to target room URL", () => {
    assert.equal(
        createRoomUrlWithAuthToken("https://play.workadventu.re/@/team/world/room?foo=bar#spawn", "token value"),
        "https://play.workadventu.re/@/team/world/room?foo=bar&token=token+value#spawn"
    );
});

test("strips sensitive query params before persisting a URL", () => {
    assert.equal(
        stripSensitiveQueryParams("https://play.workadventu.re/@/team/world/room?token=secret&foo=bar&code=abc"),
        "https://play.workadventu.re/@/team/world/room?foo=bar"
    );
    assert.equal(stripSensitiveQueryParams(undefined), undefined);
    assert.equal(stripSensitiveQueryParams("not-a-url"), "not-a-url");
});

test("normalizePersistedLastRoomUrl drops sensitive query params", () => {
    assert.equal(
        normalizePersistedLastRoomUrl("https://play.workadventu.re/@/team/world/room?token=secret&foo=bar"),
        "https://play.workadventu.re/@/team/world/room?foo=bar"
    );
});

test("redacts sensitive query params in arbitrary strings (for logs)", () => {
    assert.equal(
        redactSensitiveString("Failed to load https://play.workadventu.re/@/team/world/room?token=secret&foo=bar"),
        "Failed to load https://play.workadventu.re/@/team/world/room?token=REDACTED&foo=bar"
    );
    assert.equal(
        redactSensitiveString("multiple ?code=abc&token=xyz&refresh_token=def"),
        "multiple ?code=REDACTED&token=REDACTED&refresh_token=REDACTED"
    );
    assert.equal(redactSensitiveString(""), "");
    assert.equal(redactSensitiveString(undefined), undefined);
});
