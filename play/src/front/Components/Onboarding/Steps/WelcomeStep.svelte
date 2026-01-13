<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import LL from "../../../../i18n/i18n-svelte";

    const dispatch = createEventDispatcher<{
        next: void;
    }>();

    function handleNext() {
        dispatch("next");
    }
    function handleSkip() {
        dispatch("skip");
    }
</script>

<div class="fixed top-1/2 -right-10 transform -translate-x-14 -translate-y-1/2 z-[3001] pointer-events-auto">
    <div
        class="bg-contrast/90 backdrop-blur-lg rounded-xl p-6 max-w-lg shadow-2xl border border-white/20"
        in:fly={{ y: 10, scale: 0.9, duration: 400 }}
    >
        <div class="text-center space-y-6">
            <h2 class="text-3xl font-bold text-white mb-4">
                {$LL.onboarding.welcome.title()}
            </h2>
            <p class="text-lg text-white/90 leading-relaxed">
                {$LL.onboarding.welcome.description()}
            </p>
            <div class="flex justify-center gap-4 pt-4">
                <button
                    class="px-6 py-3 bg-secondary hover:bg-secondary-600 text-white rounded-lg font-semibold transition-all"
                    on:click={handleNext}
                >
                    {$LL.onboarding.welcome.start()}
                </button>
                <button
                    class="px-6 py-3 bg-secondary hover:bg-secondary-600 text-white rounded-lg font-semibold transition-all"
                    on:click={handleSkip}
                >
                    {$LL.onboarding.welcome.skip()}
                </button>
            </div>
        </div>
    </div>
</div>
