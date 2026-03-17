<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import { fly } from "svelte/transition";
    import LL from "../../../../i18n/i18n-svelte";
    import { isMobileOnboarding } from "../../../Stores/OnboardingStore";

    const dispatch = createEventDispatcher<{
        next: void;
    }>();

    function handleNext() {
        dispatch("next");
    }
</script>

<!-- Mobile onboarding: panel at bottom so user sees the bubble video above. Desktop: panel on the right. -->
<div
    class="z-[3001] pointer-events-auto {$isMobileOnboarding
        ? 'fixed left-4 right-8 bottom-[4.5rem]'
        : 'fixed top-1/2 -right-10 transform -translate-x-14 -translate-y-1/2'}"
>
    <div
        class="bg-contrast/90 backdrop-blur-lg rounded-xl p-4 sm:p-6 w-full max-w-lg shadow-2xl border border-white/20 {$isMobileOnboarding
            ? 'mx-auto max-h-[40vh] overflow-y-auto'
            : ''}"
        in:fly={{ y: $isMobileOnboarding ? 10 : 10, duration: 400 }}
    >
        <div class="space-y-4">
            <h3 class="text-lg sm:text-xl font-bold text-white">
                {$LL.onboarding.communication.title()}
            </h3>
            <p class="text-sm text-white/90 mb-4">
                {$LL.onboarding.communication.description()}
            </p>
            {#if $LL.onboarding.communication.video() && !$isMobileOnboarding}
                <video autoplay muted loop playsinline class="w-full rounded-lg mb-4">
                    <source src={$LL.onboarding.communication.video()} type="video/mp4" />
                </video>
            {/if}
            <button
                class="px-4 py-2 min-h-10 bg-secondary hover:bg-secondary-600 text-white rounded-lg font-semibold transition-all"
                on:click={handleNext}
            >
                {$LL.onboarding.communication.next()}
            </button>
        </div>
    </div>
</div>
