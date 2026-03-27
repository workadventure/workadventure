<script lang="ts">
    import { onDestroy, onMount } from "svelte";
    import { LL } from "../../../i18n/i18n-svelte";
    import logoImg from "../images/logo.svg";
    import bgMap from "../images/map-exemple.png";
    import poweredByWorkAdventureImg from "../images/Powered_By_WorkAdventure_Big.png";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { analyticsClient } from "../../Administration/AnalyticsClient";
    import {
        pwaInstallUiStore,
        initPwaInstallUiListeners,
        installPwaFromStore,
        continuePwaInBrowser,
        neverShowPwaPage,
    } from "../../Stores/PwaInstallStore";
    import { detectIos } from "../../Utils/PwaInstallEligibility";

    let logo = gameManager.currentStartedRoom.loginSceneLogo ?? logoImg;
    const sceneBg = gameManager.currentStartedRoom.backgroundSceneImage ?? bgMap;

    let neverShowAgain = false;
    let unsubscribePwa: (() => void) | undefined;

    onMount(() => {
        unsubscribePwa = initPwaInstallUiListeners();
        analyticsClient.pwaInstallPromptShown(detectIos());
    });

    onDestroy(() => {
        unsubscribePwa?.();
    });

    function getBackgroundColor(): string | undefined {
        return gameManager.currentStartedRoom?.backgroundColor;
    }

    function handleContinue(): void {
        if (neverShowAgain) {
            neverShowPwaPage();
            return;
        }
        continuePwaInBrowser();
    }

    async function handleInstall(): Promise<void> {
        await installPwaFromStore();
    }
</script>

<div
    class="pwa-install-screen loginScene h-dvh flex flex-col items-center justify-center pointer-events-auto relative z-30 overflow-y-auto"
>
    <div class="w-full sm:w-96 md:w-10/12 lg:w-1/2 xl:w-1/3 rounded mx-auto text-center p-8">
        <section class="text-center flex h-fit flex-col justify-center items-center gap-4 mb-4">
            <img
                draggable="false"
                src={logo}
                alt="logo"
                class="main-logo mt-8 {gameManager.currentStartedRoom.loginSceneLogo
                    ? 'max-h-[200px] object-cover'
                    : ''}"
                style="width: 333px;"
            />
        </section>

        <div class="flex flex-col items-center gap-2">
            <p class="text-sm text-white/90 sm:text-base m-0 p-0">
                {#if $pwaInstallUiStore.isIos}
                    {$LL.warning.pwaInstall.descriptionIos()}
                {:else}
                    {$LL.warning.pwaInstall.description()}
                {/if}
            </p>

            {#if $pwaInstallUiStore.isIos}
                <div class="w-full rounded-xl bg-contrast/60 p-4 text-left text-sm text-white/95">
                    <p class="mb-2 font-semibold">{$LL.warning.pwaInstall.iosStepsTitle()}</p>
                    <ol class="list-decimal list-inside space-y-1">
                        <li>{$LL.warning.pwaInstall.iosStep1()}</li>
                        <li>{$LL.warning.pwaInstall.iosStep2()}</li>
                        <li>{$LL.warning.pwaInstall.iosStep3()}</li>
                    </ol>
                </div>
            {/if}

            {#if $pwaInstallUiStore.deferredPrompt && !$pwaInstallUiStore.isIos}
                <button
                    type="button"
                    class="btn btn-secondary flex w-fit items-center justify-center gap-2"
                    on:click={handleInstall}
                    disabled={$pwaInstallUiStore.installing}
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
                    {$pwaInstallUiStore.installing
                        ? $LL.warning.pwaInstall.installing()
                        : $LL.warning.pwaInstall.install()}
                </button>
            {:else if $pwaInstallUiStore.isIos}
                <button
                    type="button"
                    class="btn btn-secondary lex w-fit justify-center"
                    on:click={handleContinue}
                    data-testid="pwa-install-continue-ios"
                >
                    {$LL.warning.pwaInstall.continue()}
                </button>
            {/if}

            <label
                class="inline-flex items-center justify-center gap-3 w-fit rounded-lg px-3 py-2 text-sm text-white/90 transition-colors hover:bg-white/5"
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
                class="btn btn-ghost btn-light flex w-fit justify-center"
                on:click={handleContinue}
                data-testid="pwa-install-skip"
            >
                {$LL.warning.pwaInstall.skip()}
            </button>
        </div>
    </div>

    {#if logo !== logoImg && gameManager.currentStartedRoom.showPoweredBy !== false}
        <section class="text-right flex powered-by justify-center items-end pb-4">
            <img draggable="false" src={poweredByWorkAdventureImg} alt="Powered by WorkAdventure" class="h-14" />
        </section>
    {/if}
</div>

<div
    class="absolute left-0 top-0 w-full h-full z-20 bg-contrast opacity-80"
    style={getBackgroundColor() != undefined ? `background-color: ${getBackgroundColor()};` : ""}
/>
<div class="absolute left-0 top-0 w-full h-full bg-cover z-10" style="background-image: url('{sceneBg}');" />

<style>
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
