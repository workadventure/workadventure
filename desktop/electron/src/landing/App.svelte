<script lang="ts">
    import { onMount, tick } from "svelte";
    import type {
        DesktopFoundWorld,
        DesktopRecentWorld,
        WorkAdventureDesktopNavigationApi,
    } from "@workadventure/desktop-api";
    import Button from "./Button.svelte";
    import ChoiceCard from "./ChoiceCard.svelte";
    import ErrorText from "./ErrorText.svelte";
    import TextField from "./TextField.svelte";
    import WorldRow from "./WorldRow.svelte";
    import { failureOf, screenPermission, t } from "./desktop";
    import { mergeWorlds } from "./worlds";

    let { navigation }: { navigation: WorkAdventureDesktopNavigationApi } = $props();

    const joinFailed = t("landing.joinFailed", "Failed to join world.");
    const linkClass =
        "cursor-pointer text-white underline underline-offset-3 hover:not-disabled:text-accent-hover focus-visible:rounded-[4px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
    const sectionLabelClass = "mb-3 font-title text-[15px] font-medium tracking-[0.05em] uppercase";

    // ── Pinned and recent worlds ────────────────────────────────────────────────────────────────
    let worlds = $state<DesktopRecentWorld[]>([]);
    let recentError = $state("");

    async function refreshWorlds() {
        try {
            const lists = await Promise.all([navigation.getPinnedWorlds?.() ?? [], navigation.getRecentWorlds?.() ?? []]);
            worlds = mergeWorlds(...lists);
        } catch (err) {
            console.warn("landing: failed to load worlds", err);
            worlds = [];
        }
    }

    function togglePin(url: string) {
        navigation
            .togglePin?.(url)
            .then(refreshWorlds)
            .catch((err) => console.warn("landing.togglePin rejected", err));
    }

    // ── Email lookup ────────────────────────────────────────────────────────────────────────────
    let email = $state("");
    let emailInput = $state<HTMLInputElement>();
    let emailError = $state("");
    let emailBusyLabel = $state("");
    let found = $state<{ email: string; worlds: DesktopFoundWorld[] } | null>(null);
    let foundError = $state("");
    let foundSection = $state<HTMLElement>();
    let foundRow = $state<WorldRow>();

    function hideFound() {
        found = null;
        foundError = "";
    }

    async function showFound(address: string, list: DesktopFoundWorld[]) {
        found = { email: address, worlds: list };
        foundError = "";
        await tick();
        if (list.length === 0) {
            // Narrow windows stack the cards, which pushes the answer below the fold.
            foundSection?.scrollIntoView({ block: "nearest", behavior: "smooth" });
            return;
        }
        // Worlds to choose from: they are all that is left on the page, and the focus goes to the
        // first one (the email field it was on is now hidden).
        window.scrollTo(0, 0);
        foundRow?.focusFirst();
    }

    async function lookUp() {
        const address = email.trim();
        if (!address || !emailInput?.checkValidity()) {
            emailError = t("landing.emailInvalid", "Please enter a valid email address.");
            emailInput?.focus();
            return;
        }
        emailError = "";
        hideFound();
        emailBusyLabel = t("landing.searching", "Searching…");
        try {
            const result = await navigation.findWorlds?.(address);
            if (!result?.ok) {
                throw new Error(result?.error || "");
            }
            if (result.worlds.length !== 1) {
                emailBusyLabel = "";
                await showFound(address, result.worlds);
                return;
            }
            // A single world: no choice to make, so its sign-in starts at once (the main process then
            // replaces this page with the "signing in" one). On failure, the card stays to retry.
            emailBusyLabel = t("landing.signingIn", "Signing in…");
            const signIn = await navigation.signInToWorld?.(result.worlds[0].url);
            if (!signIn?.ok) {
                emailBusyLabel = "";
                await showFound(address, result.worlds);
                foundError = signIn?.error || joinFailed;
            }
        } catch (err) {
            console.warn("landing.findWorlds rejected", err);
            emailBusyLabel = "";
            emailError =
                (err instanceof Error && err.message) ||
                t("landing.lookupFailed", "Couldn't look up your worlds. Paste your world link instead.");
        }
    }

    async function useAnotherEmail() {
        hideFound();
        await tick();
        emailInput?.focus();
        emailInput?.select();
    }

    // ── Join by URL, and adding an unknown server ───────────────────────────────────────────────
    let url = $state("");
    let urlInput = $state<HTMLInputElement>();
    let joinError = $state("");
    let joinBusy = $state(false);
    let trust = $state<{ url: string; origin: string } | null>(null);
    let trustBusy = $state(false);

    async function join() {
        const target = url.trim();
        if (!target) {
            joinError = t("landing.urlRequired", "Please enter a world URL.");
            urlInput?.focus();
            return;
        }
        joinError = "";
        joinBusy = true;
        trust = null;
        joinError = await failureOf(navigation.joinWorld(target), joinFailed);
        // On success the main process navigates away, so the button stays busy.
        joinBusy = !joinError;
    }

    async function confirmTrust() {
        if (!trust) {
            return;
        }
        trustBusy = true;
        try {
            const result = await navigation.trustServerAndJoin?.(trust.url);
            if (!result?.ok) {
                trust = null;
                joinError = result?.error || joinFailed;
            }
        } catch (err) {
            console.warn("landing.trustServerAndJoin rejected", err);
            trust = null;
            joinError = joinFailed;
        }
        trustBusy = false;
    }

    function cancelTrust() {
        trust = null;
        urlInput?.focus();
    }

    // ── Create a world: in the footer and, after a lookup that found nothing, next to that answer ──
    let createError = $state("");
    let signupBusy = $state(false);

    async function openSignup(): Promise<string> {
        signupBusy = true;
        const error = await failureOf(
            navigation.openAdminSignup(),
            t("landing.signupFailed", "The signup page could not be opened.")
        );
        setTimeout(() => (signupBusy = false), 500);
        return error;
    }

    // ── macOS screen recording permission ───────────────────────────────────────────────────────
    // Asked once here, before a share needs it (macOS restarts the app to apply it). "Later" hides
    // it for good; the share itself still explains how to grant it.
    const PERMISSION_DISMISSED_KEY = "screenPermissionDismissed";
    let permissionShown = $state(false);
    let permissionNext = $state(false);
    let permissionBusy = $state(false);

    function permissionDismissed(): boolean {
        try {
            return window.localStorage.getItem(PERMISSION_DISMISSED_KEY) === "1";
        } catch {
            return false;
        }
    }

    async function allowPermission() {
        permissionBusy = true;
        try {
            const state = await screenPermission?.request();
            if (state === "missing") {
                permissionNext = true;
            } else {
                permissionShown = false;
            }
        } catch (err) {
            console.warn("landing.screenPermission.request rejected", err);
        }
        permissionBusy = false;
    }

    function permissionLater() {
        try {
            window.localStorage.setItem(PERMISSION_DISMISSED_KEY, "1");
        } catch {
            // Private storage unavailable: it simply shows again next time.
        }
        permissionShown = false;
    }

    // ── Start ───────────────────────────────────────────────────────────────────────────────────
    // The main process passes ?error=… after a failed navigation, and ?trust=… for a world on a server
    // the app does not know (typed here, deep link, world switcher). Strip the query so a refresh
    // doesn't repeat them.
    const initialParams = new URLSearchParams(window.location.search);
    joinError = initialParams.get("error") ?? "";
    const initialTrustUrl = initialParams.get("trust");
    if (initialTrustUrl) {
        url = initialTrustUrl;
        try {
            trust = { url: initialTrustUrl, origin: new URL(initialTrustUrl).origin };
        } catch (err) {
            console.warn("Landing: failed to read initial trust param", err);
        }
    }
    if (window.location.search) {
        window.history.replaceState({}, "", window.location.pathname);
    }

    if (screenPermission && !permissionDismissed()) {
        screenPermission
            .get()
            .then((state) => (permissionShown = state === "missing"))
            .catch((err) => console.warn("landing.screenPermission.get rejected", err));
    }

    void refreshWorlds();

    onMount(() => {
        // Ready for the email to be typed and Enter hit. Not while asking to add a server: the question
        // keeps the focus (on Cancel, so Enter never adds one by accident).
        setTimeout(() => {
            if (!trust) {
                emailInput?.focus();
            }
        }, 50);
    });

    // With worlds, the content sits toward the top-left so the row has room to breathe; with none,
    // everything centres. The worlds found for an email are the only thing left to do, so the rest of
    // the page steps aside.
    const hasWorlds = $derived(worlds.length > 0);
    const choosingWorld = $derived(found !== null && found.worlds.length > 0);
    const centered = $derived(!hasWorlds || choosingWorld);
    // The organization only tells worlds apart when there is more than one.
    const showOrganization = $derived(new Set(found?.worlds.map((world) => world.organization)).size > 1);
</script>

<!-- Sized against the 1440x1024 design frame, but everything scales with the window and keeps the
     design's ratios rather than its exact pixels. -->
<div
    class="mx-auto flex min-h-full w-[min(1340px,100%)] flex-col px-[clamp(20px,5vw,72px)] pt-[clamp(28px,5vh,64px)] pb-[clamp(48px,9vh,104px)]"
>
    <main
        class={[
            "flex flex-1 flex-col gap-[30px]",
            hasWorlds && !choosingWorld ? "justify-start pt-[clamp(8px,4vh,48px)]" : "justify-center",
        ]}
    >
        {#if !choosingWorld}
            <div class={[!hasWorlds && "text-center"]}>
                <!-- No width cap: the headline is meant to sit on ONE line, and the fluid size keeps it
                     there down to narrow windows. `balance` only kicks in once it has to wrap. -->
                <h1
                    class="font-title text-[clamp(24px,3.2vw,46px)] leading-[1.05] font-medium tracking-[0.005em] text-balance uppercase"
                >
                    {t("landing.heading", "Your workplace, one email away.")}
                </h1>
                <p class={["mt-3.5 max-w-[66ch] text-[14px] leading-[1.55] text-muted", !hasWorlds && "mx-auto"]}>
                    {t(
                        "landing.intro",
                        "Sign in with your work email to find your worlds, or open a world from its link. Your last world will reopen automatically next time."
                    )}
                </p>
            </div>

            {#if permissionShown}
                <section
                    class="w-[min(720px,100%)] self-center rounded-[14px] border border-accent/55 bg-card px-4 py-3.5"
                    aria-labelledby="screen-permission-title"
                >
                    <p class="mb-1 font-semibold" id="screen-permission-title">
                        {t("landing.screenPermissionTitle", "Allow screen sharing")}
                    </p>
                    <p class="mb-3 text-xs text-muted">
                        {permissionNext
                            ? t(
                                  "landing.screenPermissionNext",
                                  "Turn WorkAdventure on in System Settings: macOS will then offer to restart it."
                              )
                            : t(
                                  "landing.screenPermissionBody",
                                  "macOS asks for the permission to record your screen before your first share, then restarts WorkAdventure. Give it now rather than during a conversation."
                              )}
                    </p>
                    <div class="flex flex-wrap gap-2">
                        <Button disabled={permissionBusy} onclick={allowPermission}>
                            {t("landing.screenPermissionAllow", "Allow")}
                        </Button>
                        <Button secondary onclick={permissionLater}>{t("landing.screenPermissionLater", "Later")}</Button>
                    </div>
                </section>
            {/if}

            <!-- Pinned and recent worlds share one row (the star marks the pinned ones), so the page
                 keeps a single scanning line instead of two near-identical sections. -->
            {#if hasWorlds}
                <section aria-labelledby="recent-title">
                    <h2 class={sectionLabelClass} id="recent-title">{t("landing.recentWorlds", "Recent worlds")}</h2>
                    <WorldRow
                        worlds={worlds.map((world) => ({ ...world, detail: world.url }))}
                        open={navigation.joinWorld}
                        idleLabel={t("landing.explore", "Explore")}
                        busyLabel={t("landing.opening", "Opening…")}
                        bind:error={recentError}
                        onpin={navigation.togglePin ? togglePin : undefined}
                    />
                    <ErrorText id="recent-error" message={recentError} compact />
                </section>
            {/if}

            <!-- 22 + the OR column + 22 = the gap the design leaves between the cards. Stacked below
                 ~1100px, where the ratio-derived height no longer fits the Join card's copy. -->
            <div
                class={[
                    "flex items-stretch gap-[clamp(12px,1.7vw,22px)] max-[1100px]:flex-col",
                    !hasWorlds && "justify-center",
                ]}
            >
                <ChoiceCard
                    title={t("landing.emailTitle", "Sign in with your email")}
                    hint={t("landing.emailHint", "We'll find the worlds you belong to and sign you in.")}
                    fitContent={trust !== null}
                    onsubmit={lookUp}
                >
                    <TextField
                        id="email"
                        label={t("landing.emailLabel", "Your work email")}
                        type="email"
                        name="email"
                        placeholder="you@company.com"
                        autocomplete="email"
                        aria-describedby="email-error"
                        required
                        bind:value={email}
                        bind:input={emailInput}
                        oninput={() => {
                            // Editing the address withdraws the answer: it was about the address typed before.
                            hideFound();
                            emailError = "";
                        }}
                    />
                    <ErrorText id="email-error" message={emailError} />
                    <!-- Buttons hang bottom-right, on the same baseline whatever copy each card holds. -->
                    <div class="mt-auto flex justify-end pt-[clamp(4px,0.8vw,12px)]">
                        <Button type="submit" disabled={emailBusyLabel !== ""}>
                            {emailBusyLabel || t("landing.continue", "Continue")}
                        </Button>
                    </div>
                </ChoiceCard>

                <div
                    class="flex flex-[0_0_clamp(34px,5.5vw,80px)] items-center justify-center text-[11px] tracking-[0.12em] text-muted uppercase max-[1100px]:basis-auto max-[1100px]:py-0.5"
                    aria-hidden="true"
                >
                    {t("landing.or", "or")}
                </div>

                <ChoiceCard
                    title={t("landing.joinTitle", "Open a world link")}
                    hint={t("landing.joinHint", "Paste the complete URL from your invitation or browser.")}
                    fitContent={trust !== null}
                    onsubmit={join}
                >
                    <TextField
                        id="world-url"
                        label={t("landing.urlLabel", "Enter your world URL")}
                        type="url"
                        name="url"
                        placeholder="https://play.workadventu.re/@/..."
                        inputmode="url"
                        autocomplete="url"
                        aria-describedby="join-error"
                        required
                        bind:value={url}
                        bind:input={urlInput}
                        oninput={() => (trust = null)}
                    />
                    <ErrorText id="join-error" message={joinError} />
                    {#if trust}
                        <!-- Self-hosted server unknown to the portal: the user confirms before the app trusts it.
                             Its own buttons replace "Open world" while it is shown. -->
                        <div
                            class="mt-2 rounded border border-alert/45 bg-alert/8 px-3.5 py-3"
                            role="alertdialog"
                            aria-labelledby="trust-title"
                        >
                            <p class="mb-1 font-semibold" id="trust-title">{t("landing.trustTitle", "Add this server?")}</p>
                            <p class="mb-3 text-xs wrap-anywhere text-muted">
                                {t(
                                    "landing.trustBody",
                                    "{origin} isn't a WorkAdventure world the app knows. Only add a server you trust, such as your company's."
                                ).replace("{origin}", trust.origin)}
                            </p>
                            <div class="flex flex-wrap gap-2">
                                <Button disabled={trustBusy} onclick={confirmTrust}>
                                    {t("landing.trustConfirm", "Add and open")}
                                </Button>
                                <Button secondary onclick={cancelTrust} {@attach (button) => button.focus()}>
                                    {t("landing.trustCancel", "Cancel")}
                                </Button>
                            </div>
                        </div>
                    {:else}
                        <div class="mt-auto flex justify-end pt-[clamp(4px,0.8vw,12px)]">
                            <Button type="submit" disabled={joinBusy}>
                                {joinBusy ? t("landing.opening", "Opening…") : t("landing.openWorld", "Open world")}
                            </Button>
                        </div>
                    {/if}
                </ChoiceCard>
            </div>
        {/if}

        <!-- The email lookup's answer: the worlds to sign in to, or why there are none. -->
        {#if found}
            <section bind:this={foundSection} class={[centered && "text-center"]} aria-labelledby="found-title">
                <h2 class={sectionLabelClass} id="found-title">
                    {#if found.worlds.length === 0}
                        <!-- The label is set in capitals; the address keeps its own case, as typed. -->
                        {#each t("landing.noWorldFound", "No world found for {email}").split("{email}") as part, index}{#if index > 0}<span
                                    class="normal-case">{found.email}</span
                                >{/if}{part}{/each}
                    {:else}
                        {t("landing.yourWorlds", "Your worlds")}
                    {/if}
                </h2>
                {#if choosingWorld}
                    <p class="-mt-1 mb-3.5 text-[14px] text-muted">
                        <span>{found.email}</span>
                        <button type="button" class={["ml-2.5", linkClass]} onclick={useAnotherEmail}>
                            {t("landing.useAnotherEmail", "Use another email")}
                        </button>
                    </p>
                    <WorldRow
                        bind:this={foundRow}
                        worlds={found.worlds.map((world) => ({
                            url: world.url,
                            label: world.name,
                            detail: showOrganization ? world.organization : "",
                            thumbnail: world.thumbnail,
                        }))}
                        open={(worldUrl) => navigation.signInToWorld?.(worldUrl)}
                        idleLabel={t("landing.signIn", "Sign in")}
                        busyLabel={t("landing.signingIn", "Signing in…")}
                        {centered}
                        bind:error={foundError}
                    />
                {:else}
                    <div
                        class={[
                            "flex max-w-[760px] flex-wrap items-center gap-x-5 gap-y-3",
                            centered && "mx-auto justify-center-safe",
                        ]}
                    >
                        <p class="flex-[1_1_320px] text-sm text-muted">
                            {t(
                                "landing.noWorldHint",
                                "Check the address, or ask your administrator to invite you. You can also create a world for your team."
                            )}
                        </p>
                        <Button secondary disabled={signupBusy} onclick={async () => (foundError = await openSignup())}>
                            {t("landing.createWorld", "Create a world")}
                        </Button>
                    </div>
                {/if}
                <ErrorText id="found-error" message={foundError} compact />
            </section>
        {/if}

        {#if !choosingWorld}
            <div class={["text-[14px] text-muted", !hasWorlds && "text-center"]}>
                <span>{t("landing.newHere", "New to WorkAdventure?")}</span>
                <button
                    type="button"
                    class={linkClass}
                    disabled={signupBusy}
                    onclick={async () => (createError = await openSignup())}
                >
                    {t("landing.createWorld", "Create a world")}
                </button>
                <ErrorText id="create-error" message={createError} />
            </div>
        {/if}
    </main>
</div>
