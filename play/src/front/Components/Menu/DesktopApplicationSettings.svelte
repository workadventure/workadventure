<script lang="ts">
    import { onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import { desktopDownloadUrl, desktopVersionStatus } from "../../../common/DesktopVersionPolicy";
    import { DESKTOP_VERSION_POLICY } from "../../Enum/EnvironmentVariable";

    const desktop = window.WAD?.desktop ? window.WAD : undefined;
    const policy = DESKTOP_VERSION_POLICY;
    const downloadUrl = desktopDownloadUrl(policy);
    let installed = $state<string>();
    let status = $derived(desktopVersionStatus(installed, policy));
    onMount(() => {
        let active = true;
        if (desktop) {
            desktop
                .getVersion()
                .then((version) => {
                    if (active) installed = version;
                })
                .catch((error: unknown) => console.warn("Could not read desktop version", error));
        }
        return () => {
            active = false;
        };
    });
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
        <a
            href={downloadUrl}
            target="_blank"
            rel="noopener noreferrer"
            class="underline text-light-blue self-start"
            data-testid="desktop-approved-download">{$LL.desktop.application.download()}</a
        >
    {/if}
    <p class="text-sm opacity-75">{$LL.desktop.application.managed()}</p>
</section>
