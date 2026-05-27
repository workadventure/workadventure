<script lang="ts">
    import type { Snippet } from "svelte";
    import { fade } from "svelte/transition";
    import { onboardingStore } from "../../Stores/OnboardingStore";

    interface Props {
        children?: Snippet;
    }

    let { children }: Props = $props();
</script>

<div
    class="fixed inset-0 z-[3000] pointer-events-none"
    data-testid="onboarding-step"
    transition:fade={{ duration: 300 }}
>
    <!-- Overlay with gray background and blur - only for welcome step -->
    {#if $onboardingStore === "welcome"}
        <div class="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto"></div>
    {/if}

    <!-- Content slot -->
    <div class="relative z-10 pointer-events-none">
        {@render children?.()}
    </div>
</div>
