<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import type { BeforeInstallPromptEvent } from "../../../types/pwa-install";
    import logo from "../images/logo.svg";

    export let deferredPrompt: BeforeInstallPromptEvent | null = null;
    export let isIos = false;
    export let onInstall: () => void = () => {};
    export let onSkip: () => void = () => {};
    export let installing = false;
</script>

<div class="pwa-install-prompt fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-contrast">
    <div class="pwa-install-card flex h-fit max-h-full w-full max-w-md flex-col overflow-hidden">
        <div class="flex flex-1 flex-col items-center justify-center p-6 text-center sm:p-8 gap-4">
            <div class="mb-4 flex items-center justify-center">
                <img src={logo} alt="WorkAdventure" class="pwa-install-logo h-auto w-auto max-w-full" />
            </div>
            <p class="mt-3 text-sm text-white/90 sm:text-base">
                {#if isIos}
                    {$LL.warning.pwaInstall.descriptionIos()}
                {:else}
                    {$LL.warning.pwaInstall.description()}
                {/if}
            </p>
            <div class="flex flex-col gap-2">
                {#if isIos}
                    <div class="mt-4 w-full rounded-xl bg-contrast/60 p-4 text-left text-sm text-white/95">
                        <p class="mb-2 font-semibold">{$LL.warning.pwaInstall.iosStepsTitle()}</p>
                        <ol class="list-decimal list-inside space-y-1">
                            <li>{$LL.warning.pwaInstall.iosStep1()}</li>
                            <li>{$LL.warning.pwaInstall.iosStep2()}</li>
                            <li>{$LL.warning.pwaInstall.iosStep3()}</li>
                        </ol>
                    </div>
                {/if}
                {#if deferredPrompt && !isIos}
                    <button
                        type="button"
                        class="btn btn-secondary flex w-full items-center justify-center gap-2"
                        on:click={onInstall}
                        disabled={installing}
                        data-testid="pwa-install-button"
                    >
                        <svg
                            class="h-5 w-5 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="2"
                                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                            />
                        </svg>
                        {installing ? $LL.warning.pwaInstall.installing() : $LL.warning.pwaInstall.install()}
                    </button>
                {:else if isIos}
                    <button
                        type="button"
                        class="btn btn-secondary flex w-full justify-center"
                        on:click={onSkip}
                        data-testid="pwa-install-continue-ios"
                    >
                        {$LL.warning.pwaInstall.continue()}
                    </button>
                {/if}
                <button
                    type="button"
                    class="btn btn-ghost btn-light flex w-full justify-center"
                    on:click={onSkip}
                    data-testid="pwa-install-skip"
                >
                    {$LL.warning.pwaInstall.skip()}
                </button>
            </div>
        </div>
    </div>
</div>

<style>
    .pwa-install-prompt {
        -webkit-overflow-scrolling: touch;
    }
    .pwa-install-card {
        max-height: min(90dvh, 560px);
    }
</style>
