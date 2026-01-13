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

<div class="fixed top-1/2 right-0 transform -translate-x-1/2 -translate-y-1/2 z-[3001] pointer-events-auto">
    <div
        class="bg-contrast/90 backdrop-blur-lg rounded-xl p-6 max-w-lg shadow-2xl border border-white/20"
        in:fly={{ y: 10, scale: 0.9, duration: 400 }}
    >
        <div class="space-y-4">
            <h3 class="text-xl font-bold text-white">
                {$LL.onboarding.movement.title()}
            </h3>
            <p class="text-sm text-white/90">
                {$LL.onboarding.movement.description()}
            </p>
            <div class="flex items-center gap-2 text-xs text-white/70">
                <kbd class="px-2 py-1 bg-white/10 rounded">W</kbd>
                <kbd class="px-2 py-1 bg-white/10 rounded">A</kbd>
                <kbd class="px-2 py-1 bg-white/10 rounded">S</kbd>
                <kbd class="px-2 py-1 bg-white/10 rounded">D</kbd>
                <span>or arrow keys</span>
            </div>
        </div>
    </div>
</div>
