<script lang="ts">
    import { onMount } from "svelte";
    import type { DesktopWindowMode } from "@workadventure/desktop-api";
    import Button from "../landing/Button.svelte";
    import { SHORTCUT_NAMES, type ShortcutName } from "../shortcut-policy";
    import type { SettingsApi, SettingsState } from "./api";
    import { t } from "./desktop";
    import Section from "./Section.svelte";
    import ShortcutField from "./ShortcutField.svelte";

    let { api }: { api: SettingsApi } = $props();

    let settings = $state<SettingsState>();
    let shortcutErrors = $state<Partial<Record<ShortcutName, string>>>({});

    async function refresh() {
        try {
            settings = (await api.getState()) ?? settings;
        } catch (err) {
            console.warn("Settings: could not read them", err);
        }
    }

    onMount(() => {
        void refresh();
        // They may have changed meanwhile: in WorkAdventure's settings, the menu, the system's own startup settings.
        window.addEventListener("focus", refresh);
        return () => window.removeEventListener("focus", refresh);
    });

    /** A checkbox shows what the app ends up with: a cancelled confirmation, or a system that said no. */
    async function toggle(event: Event, set: (on: boolean) => Promise<boolean>): Promise<boolean | undefined> {
        const input = event.currentTarget as HTMLInputElement;
        try {
            input.checked = await set(input.checked);
            return input.checked;
        } catch (err) {
            console.warn("Settings: could not change it", err);
            input.checked = !input.checked;
            return undefined;
        }
    }

    const windowModes = [
        {
            mode: "x11" as const,
            label: t("settings.windowModeX11"),
            description: t("settings.windowModeX11Description"),
        },
        {
            mode: "wayland" as const,
            label: t("settings.windowModeWayland"),
            description: t("settings.windowModeWaylandDescription"),
        },
    ];

    async function setWindowMode(mode: DesktopWindowMode) {
        try {
            const state = await api.setWindowMode(mode);
            if (settings && state) settings.windowMode = state;
        } catch (err) {
            console.warn("Settings: could not change the window mode", err);
        }
    }

    const shortcutLabels: Record<ShortcutName, string> = {
        mute_toggle: t("settings.shortcutMute"),
        camera_toggle: t("settings.shortcutCamera"),
        companion_toggle: t("settings.shortcutCompanion"),
    };

    async function setShortcut(name: ShortcutName, accelerator: string) {
        if (!settings) return;
        const accelerators = settings.shortcuts.accelerators;
        if (accelerator && SHORTCUT_NAMES.some((other) => other !== name && accelerators[other] === accelerator)) {
            shortcutErrors[name] = t("settings.shortcutDuplicate");
            return;
        }
        shortcutErrors[name] = "";
        try {
            const shortcuts = await api.setShortcut(name, accelerator);
            if (shortcuts) settings.shortcuts = shortcuts;
        } catch (err) {
            console.warn("Settings: could not change the shortcut", err);
        }
    }

    const checkboxClass = "mt-0.5 size-4 shrink-0 cursor-pointer accent-accent disabled:cursor-default";
    const linkClass =
        "cursor-pointer text-[13px] text-muted underline underline-offset-3 hover:not-disabled:text-white disabled:invisible focus-visible:rounded-[4px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus-ring";
</script>

{#if settings}
    <main class="mx-auto flex min-h-screen max-w-[640px] flex-col gap-4 px-5 py-6">
        <h1 class="font-title text-[26px] leading-[1.2] font-medium uppercase">{t("settings.title")}</h1>

        <Section title={t("settings.general")}>
            <label class="flex cursor-pointer gap-3">
                <input
                    type="checkbox"
                    class={checkboxClass}
                    checked={settings.startAtLogin}
                    onchange={async (event) => {
                        const on = await toggle(event, api.setStartAtLogin);
                        if (settings && on !== undefined) settings.startAtLogin = on;
                    }}
                    data-testid="settings-start-at-login"
                />
                <span>{t("settings.startAtLogin")}</span>
            </label>
            <label class="flex cursor-pointer gap-3">
                <input
                    type="checkbox"
                    class={checkboxClass}
                    checked={settings.tabBar}
                    onchange={async (event) => {
                        const on = await toggle(event, api.setTabBar);
                        if (settings && on !== undefined) settings.tabBar = on;
                    }}
                    data-testid="settings-tab-bar"
                />
                <span class="flex flex-col gap-0.5">
                    <span>{t("settings.showTabBar")}</span>
                    <span class="text-[13px] text-muted">{t("settings.showTabBarHint")}</span>
                </span>
            </label>
        </Section>

        {#if settings.windowMode}
            {@const windowMode = settings.windowMode}
            <Section title={t("settings.windowMode")}>
                <div class="flex flex-col gap-3" data-testid="settings-window-mode">
                    {#each windowModes as option (option.mode)}
                        {@const disabled =
                            windowMode.setByCommandLine || (option.mode === "x11" && windowMode.x11Unavailable)}
                        <label class={["flex gap-3", disabled ? "opacity-60" : "cursor-pointer"]}>
                            <input
                                type="radio"
                                name="window-mode"
                                class={checkboxClass}
                                value={option.mode}
                                checked={windowMode.saved === option.mode}
                                {disabled}
                                onchange={() => setWindowMode(option.mode)}
                            />
                            <span class="flex flex-col gap-0.5">
                                <span>{option.label}</span>
                                <span class="text-[13px] leading-[1.5] text-muted">{option.description}</span>
                            </span>
                        </label>
                    {/each}
                </div>
                {#if windowMode.setByCommandLine}
                    <p class="text-[13px] text-muted">{t("settings.windowModeSetByCommandLine")}</p>
                {:else if windowMode.x11Unavailable}
                    <p class="text-[13px] text-muted">{t("settings.windowModeX11Unavailable")}</p>
                {/if}
                {#if windowMode.restartNeeded}
                    <div
                        class="flex flex-col gap-3 rounded border border-accent/55 bg-white/5 px-4 py-3"
                        data-testid="settings-window-mode-restart"
                    >
                        {#if windowMode.saved === "wayland"}
                            <p class="text-alert">{t("settings.windowModeWaylandAfterRestart")}</p>
                        {/if}
                        <p class="text-[14px]">{t("settings.windowModeRestartNeeded")}</p>
                        <div><Button onclick={() => api.restart()}>{t("settings.restartNow")}</Button></div>
                    </div>
                {/if}
            </Section>
        {/if}

        <Section title={t("settings.shortcuts")} hint={t("settings.shortcutsHint")}>
            {#each SHORTCUT_NAMES as name (name)}
                {@const accelerator = settings.shortcuts.accelerators[name]}
                {@const error =
                    shortcutErrors[name] ||
                    (accelerator && settings.shortcuts.unavailable.includes(name) ? t("settings.shortcutTaken") : "")}
                <div class="flex flex-col gap-1" data-testid={`settings-shortcut-${name}`}>
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                        <span class="min-w-[9rem] flex-1" id={`shortcut-${name}`}>{shortcutLabels[name]}</span>
                        <ShortcutField
                            {accelerator}
                            platform={api.platform}
                            labelledby={`shortcut-${name}`}
                            onchange={(value) => setShortcut(name, value)}
                            onerror={(message) => (shortcutErrors[name] = message)}
                        />
                        <button
                            type="button"
                            class={linkClass}
                            disabled={!accelerator}
                            onclick={() => setShortcut(name, "")}>{t("settings.shortcutClear")}</button
                        >
                    </div>
                    {#if error}
                        <p role="alert" class="text-[12px] text-alert">{error}</p>
                    {/if}
                </div>
            {/each}
        </Section>

        <Section title={t("settings.updates")}>
            <div class="flex flex-wrap items-center justify-between gap-3">
                <span data-testid="settings-version">{t("settings.version", { version: settings.version })}</span>
                <Button secondary onclick={() => api.checkForUpdates()}>{t("settings.checkForUpdates")}</Button>
            </div>
        </Section>

        <Section title={t("settings.troubleshooting")}>
            <div class="flex flex-wrap gap-3">
                <Button secondary onclick={() => api.openLogs()}>{t("settings.openLogs")}</Button>
                <Button secondary onclick={() => api.openDevTools()}>{t("settings.openDevTools")}</Button>
            </div>
        </Section>
    </main>
{/if}
