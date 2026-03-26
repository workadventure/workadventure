<script lang="ts">
    import { LL } from "../../../i18n/i18n-svelte";
    import type { BeforeInstallPromptEvent } from "../../../types/pwa-install";
    import logo from "../images/logo.svg";

    export let deferredPrompt: BeforeInstallPromptEvent | null = null;
    export let isIos = false;
    export let onInstall: () => void = () => {};
    export let onSkip: () => void = () => {};
    export let onNeverShow: () => void = () => {};
    export let installing = false;

    let neverShowAgain = false;

    function handleContinue(): void {
        if (neverShowAgain) {
            onNeverShow();
            return;
        }
        onSkip();
    }
</script>

<div
    class="pwa-install-prompt pointer-events-auto fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80"
>
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
            <div class="flex flex-col gap-1">
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
                        on:click={handleContinue}
                        data-testid="pwa-install-continue-ios"
                    >
                        {$LL.warning.pwaInstall.continue()}
                    </button>
                {/if}
                <label
                    class="mt-1 inline-flex items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/5"
                >
                    <input
                        type="checkbox"
                        class="pwa-never-show-checkbox"
                        bind:checked={neverShowAgain}
                        data-testid="pwa-install-never-show-input"
                    />
                    <span class="select-none">{$LL.warning.pwaInstall.neverShowPage()}</span>
                </label>
                <button
                    type="button"
                    class="btn btn-ghost btn-light flex w-full justify-center"
                    on:click={handleContinue}
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

    .pwa-never-show-checkbox {
        appearance: none;
        -webkit-appearance: none;
        width: 1.15rem;
        height: 1.15rem;
        border: 2px solid rgba(255, 255, 255, 0.6);
        border-radius: 0.4rem;
        background: rgba(255, 255, 255, 0.06);
        display: inline-grid;
        place-content: center;
        cursor: pointer;
        transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease, transform 0.1s ease;
    }

    .pwa-never-show-checkbox:hover {
        border-color: rgba(255, 255, 255, 0.9);
    }

    .pwa-never-show-checkbox:active {
        transform: scale(0.96);
    }

    .pwa-never-show-checkbox:focus-visible {
        outline: none;
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.45);
    }

    .pwa-never-show-checkbox::before {
        content: "";
        width: 0.35rem;
        height: 0.6rem;
        border-right: 2px solid transparent;
        border-bottom: 2px solid transparent;
        transform: rotate(45deg) scale(0);
        transition: transform 0.12s ease;
        margin-top: -0.04rem;
    }

    .pwa-never-show-checkbox:checked {
        border-color: #ffffff;
        background: linear-gradient(180deg, #4f9bff 0%, #2f7df4 100%);
    }

    .pwa-never-show-checkbox:checked::before {
        border-right-color: #ffffff;
        border-bottom-color: #ffffff;
        transform: rotate(45deg) scale(1);
    }
</style>
