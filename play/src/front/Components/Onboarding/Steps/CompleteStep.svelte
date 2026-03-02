<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import LL from "../../../../i18n/i18n-svelte";
    import { gameManager } from "../../../Phaser/Game/GameManager";
    import { isMobileOnboarding } from "../../../Stores/OnboardingStore";

    const dispatch = createEventDispatcher<{
        next: void;
    }>();

    const worldName = gameManager.getCurrentGameScene()?.room?.roomName ?? "WorkAdventure";

    function handleNext() {
        dispatch("next");
    }
</script>

<!-- Mobile onboarding: panel at bottom. Desktop: panel on the right. -->
<div
    class="z-[3001] pointer-events-auto {$isMobileOnboarding
        ? 'fixed left-4 right-4 bottom-[4.5rem]'
        : 'fixed top-1/2 -right-10 transform -translate-x-14 -translate-y-1/2'}"
>
    <div
        class="bg-contrast/90 backdrop-blur-lg rounded-xl p-4 sm:p-6 w-full max-w-lg shadow-2xl border border-white/20 {$isMobileOnboarding
            ? 'mx-auto max-h-[50vh] overflow-y-auto'
            : ''}"
        in:fly={{ y: $isMobileOnboarding ? 10 : 10, duration: 400 }}
    >
        <div class="text-center space-y-4 sm:space-y-6">
            <h2 class="text-2xl sm:text-3xl font-bold text-white mb-3 sm:mb-4">
                {$LL.onboarding.complete.title()}
            </h2>
            <p class="text-base sm:text-lg text-white/90 leading-relaxed">
                {$LL.onboarding.complete.description({ worldName })}
            </p>
            <div class="flex justify-center gap-4 pt-4">
                <button
                    class="px-5 py-3 sm:px-6 min-h-11 bg-secondary hover:bg-secondary-600 text-white rounded-lg font-semibold transition-all"
                    on:click={handleNext}
                >
                    {$LL.onboarding.complete.finish()}
                </button>
            </div>
        </div>
    </div>
</div>
