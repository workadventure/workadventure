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
</script>

<div class="fixed top-1/2 -right-10 transform -translate-x-14 -translate-y-1/2 z-[3001] pointer-events-auto">
    <div
        class="bg-contrast/90 backdrop-blur-lg rounded-xl p-6 max-w-lg shadow-2xl border border-white/20"
        in:fly={{ y: 10, scale: 0.9, duration: 400 }}
    >
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-white">
                {$LL.onboarding.screenSharing.title()}
            </h3>
            <p class="text-sm text-white/90 mb-4">
                {$LL.onboarding.screenSharing.description()}
            </p>
            {#if $LL.onboarding.screenSharing.video()}
                <video
                    autoplay
                    muted
                    loop
                    class="w-full rounded-lg mb-4"
                >
                    <source src={$LL.onboarding.screenSharing.video()} type="video/mp4" />
                </video>
            {/if}
            <p class="text-xs text-white/70 italic">
                {$LL.onboarding.screenSharing.hint()}
            </p>
            <button
                class="mt-4 px-4 py-2 bg-secondary hover:bg-secondary-600 text-white rounded-lg font-semibold transition-all"
                on:click={handleNext}
            >
                {$LL.onboarding.screenSharing.next()}
            </button>
        </div>
    </div>
</div>
