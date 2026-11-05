<script lang="ts">
    import { onMount } from "svelte";
    import type { DesktopWindowMode, DesktopWindowModeState } from "@workadventure/desktop-api";
    import { LL } from "../../../i18n/i18n-svelte";
    import { desktopDownloadUrl, desktopVersionStatus } from "../../../common/DesktopVersionPolicy";
    import { DESKTOP_VERSION_POLICY } from "../../Enum/EnvironmentVariable";
    import InputSwitch from "../Input/InputSwitch.svelte";
    import InputRadio from "../Input/InputRadio.svelte";
    import Button from "../UI/Button.svelte";

    const desktop = window.WAD?.desktop ? window.WAD : undefined;
    // Desktop apps with a settings window of their own show these settings there.
    const openDesktopSettings = desktop?.openSettings;
    const policy = DESKTOP_VERSION_POLICY;
    const downloadUrl = desktopDownloadUrl(policy);
    let installed = $state<string>();
    let status = $derived(desktopVersionStatus(installed, policy));
    // Undefined until the app answers; older desktop apps have no startAtLogin, so no switch.
    let startAtLogin = $state<boolean>();
    // Linux under Wayland only: undefined elsewhere, on older desktop apps, and until the app answers.
    let windowMode = $state<DesktopWindowModeState>();
    let windowModeChoice = $state<DesktopWindowMode>();
    onMount(() => {
        let active = true;
        if (desktop) {
            desktop
                .getVersion()
                .then((version) => {
                    if (active) installed = version;
                })
                .catch((error: unknown) => console.warn("Could not read desktop version", error));
            if (!openDesktopSettings) {
                desktop.startAtLogin
                    ?.get()
                    .then((enabled) => {
                        if (active) startAtLogin = enabled;
                    })
                    .catch((error: unknown) => console.warn("Could not read start at login", error));
                desktop.windowMode
                    ?.get()
                    .then((state) => {
                        if (active) showWindowMode(state);
                    })
                    .catch((error: unknown) => console.warn("Could not read the window mode", error));
            }
        }
        return () => {
            active = false;
        };
    });

    let windowModeOptions = $derived([
        {
            mode: "x11" as const,
            label: $LL.desktop.application.windowMode.x11(),
            description: $LL.desktop.application.windowMode.x11Description(),
        },
        {
            mode: "wayland" as const,
            label: $LL.desktop.application.windowMode.wayland(),
            description: $LL.desktop.application.windowMode.waylandDescription(),
        },
    ]);

    function showWindowMode(state: DesktopWindowModeState) {
        windowMode = state;
        windowModeChoice = state.saved;
    }

    function saveWindowMode() {
        if (!windowModeChoice) return;
        desktop?.windowMode
            ?.set(windowModeChoice)
            .then(showWindowMode)
            .catch((error: unknown) => {
                console.warn("Could not change the window mode", error);
                windowModeChoice = windowMode?.saved;
            });
    }

    function saveStartAtLogin(enabled: boolean) {
        desktop?.startAtLogin
            ?.set(enabled)
            .then((result) => {
                // What the system ends up with: macOS may wait for the user's approval in its settings.
                startAtLogin = result;
            })
            .catch((error: unknown) => {
                console.warn("Could not change start at login", error);
                startAtLogin = !enabled;
            });
    }
</script>

<section
    class="m-4 p-4 rounded-lg bg-white/5 flex flex-col gap-3"
    aria-label={$LL.desktop.application.title()}
    data-testid="desktop-application-settings"
>
    <h3 class="font-semibold text-lg">{$LL.desktop.application.title()}</h3>
    {#if desktop}
        <p>
            {$LL.desktop.application.installed()}:
            <strong data-testid="desktop-installed-version">{installed ?? $LL.desktop.application.unknown()}</strong>
        </p>
        {#if openDesktopSettings}
            <Button
                variant="secondary"
                class="self-start"
                dataTestId="desktop-open-settings"
                onclick={() => openDesktopSettings()}>{$LL.desktop.application.openSettings()}</Button
            >
        {/if}
        {#if startAtLogin !== undefined}
            <InputSwitch
                id="desktop-start-at-login"
                bind:value={startAtLogin}
                onchange={() => saveStartAtLogin(startAtLogin === true)}
                label={$LL.desktop.application.startAtLogin()}
                margin=""
            />
        {/if}
        {#if windowMode}
            <fieldset class="flex flex-col gap-1" data-testid="desktop-window-mode">
                <legend class="font-semibold">{$LL.desktop.application.windowMode.title()}</legend>
                {#each windowModeOptions as option (option.mode)}
                    <!-- One column, title then description: the label lays its children out in a row. -->
                    <InputRadio
                        id={`desktop-window-mode-${option.mode}`}
                        value={option.mode}
                        bind:group={windowModeChoice}
                        onchange={saveWindowMode}
                        disabled={windowMode.setByCommandLine || (option.mode === "x11" && windowMode.x11Unavailable)}
                        label=""
                    >
                        <span class="flex flex-col gap-1">
                            <span>{option.label}</span>
                            <span class="text-sm opacity-75">{option.description}</span>
                        </span>
                    </InputRadio>
                {/each}
                {#if windowMode.setByCommandLine}
                    <p class="text-sm opacity-75">{$LL.desktop.application.windowMode.setByCommandLine()}</p>
                {:else if windowMode.x11Unavailable}
                    <p class="text-sm opacity-75">{$LL.desktop.application.windowMode.x11Unavailable()}</p>
                {/if}
                {#if windowMode.restartNeeded}
                    <div
                        class="flex flex-col gap-2 p-3 rounded-lg bg-white/10"
                        data-testid="desktop-window-mode-restart"
                    >
                        {#if windowMode.saved === "wayland"}
                            <p class="text-warning">{$LL.desktop.application.windowMode.waylandAfterRestart()}</p>
                        {/if}
                        <p>{$LL.desktop.application.windowMode.restartNeeded()}</p>
                        <Button
                            variant="secondary"
                            class="self-start"
                            dataTestId="desktop-window-mode-restart-now"
                            onclick={() => desktop?.windowMode?.restart()}
                            >{$LL.desktop.application.windowMode.restartNow()}</Button
                        >
                    </div>
                {/if}
            </fieldset>
        {/if}
    {:else}
        <p>{$LL.desktop.application.browser()}</p>
    {/if}
    {#if policy.recommendedVersion}
        <p>{$LL.desktop.application.recommendedVersion()}: <strong>{policy.recommendedVersion}</strong></p>
    {/if}
    {#if policy.minimumVersion}
        <p>{$LL.desktop.application.minimumVersion()}: <strong>{policy.minimumVersion}</strong></p>
    {/if}
    {#if desktop && status !== "unknown"}
        <p role="status" class:text-warning={status === "belowMinimum"}>{$LL.desktop.application.status[status]()}</p>
    {/if}
    {#if downloadUrl}
        <!-- A link that looks like a button: it opens the page in the browser. -->
        <Button
            variant="secondary"
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="self-start"
            dataTestId="desktop-approved-download">{$LL.desktop.application.download()}</Button
        >
    {/if}
    <p class="text-sm opacity-75">{$LL.desktop.application.managed()}</p>
</section>
