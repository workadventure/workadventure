<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { get, type Unsubscriber } from "svelte/store";
    import { onboardingStore } from "../../Stores/OnboardingStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { hasMovedEventName } from "../../Phaser/Player/Player";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { currentPlayerGroupIdStore } from "../../Stores/CurrentPlayerGroupStore";
    import { inJitsiStore, inLivekitStore, silentStore } from "../../Stores/MediaStore";
    import type { GameScene } from "../../Phaser/Game/GameScene";
    import OnboardingStep from "./OnboardingStep.svelte";
    import OnboardingHighlight from "./OnboardingHighlight.svelte";
    import WelcomeStep from "./Steps/WelcomeStep.svelte";
    import MovementStep from "./Steps/MovementStep.svelte";
    import CommunicationStep from "./Steps/CommunicationStep.svelte";
    import LockBubbleStep from "./Steps/LockBubbleStep.svelte";
    import ScreenSharingStep from "./Steps/ScreenSharingStep.svelte";
    import PictureInPictureStep from "./Steps/PictureInPictureStep.svelte";
    import CompleteStep from "./Steps/CompleteStep.svelte";

    let movementTimeout: ReturnType<typeof setTimeout> | null = null;
    let onboardingHighlight: OnboardingHighlight | null = null;
    let onboardingUnsubscribe: Unsubscriber | undefined = undefined;
    let currentGameScene: GameScene | undefined = undefined;

    // Listen for ESC key to exit onboarding
    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "Escape" && $onboardingStore) {
            handleSkip();
        }
    };

    function destroyOnboarding() {
        currentGameScene?.CurrentPlayer?.off(hasMovedEventName, handlePlayerMove);
        if (movementTimeout) clearTimeout(movementTimeout);
        window.removeEventListener("keydown", handleKeyDown);
        if (onboardingUnsubscribe) onboardingUnsubscribe();
    }

    onMount(() => {
        // Listen to player movement for step 2
        currentGameScene = gameManager.getCurrentGameScene();
        currentGameScene?.CurrentPlayer?.on(hasMovedEventName, handlePlayerMove);

        // Auto-start onboarding if not completed (with a small delay to ensure scene is loaded)
        setTimeout(() => {
            if (onboardingStore.isCompleted()) return;

            // Start the onboarding
            onboardingStore.start();
            window.addEventListener("keydown", handleKeyDown);

            // Subscribe to the onboarding store
            onboardingUnsubscribe = onboardingStore.subscribe((step) => {
                if (step === null) {
                    destroyOnboarding();
                }
            });
        }, 800);

        return () => {
            destroyOnboarding();
        };
    });

    onDestroy(() => {
        destroyOnboarding();
    });

    function handlePlayerMove() {
        if ($onboardingStore === "movement") {
            if (movementTimeout) clearTimeout(movementTimeout);
            // Wait 5 seconds after movement, then advance only when no movement key is pressed
            movementTimeout = setTimeout(() => {
                // Advance to the next step only if no movement key is pressed for 2 seconds
                onboardingStore.next();
            }, 1000);
        }
    }

    function handleNext() {
        // If we're in the lockBubble step, lock the bubble (make it red) before advancing
        if ($onboardingStore === "lockBubble" && onboardingHighlight) {
            onboardingHighlight.lockBubble();
        }
        onboardingStore.next();
    }

    function handleSkip() {
        onboardingStore.skip();
    }

    // During onboarding: temporarily disable silent zone so the communication demo works
    $: silentStore.setOnboardingOverride($onboardingStore !== null);

    // Cancel onboarding if user enters a real conversation bubble or meeting
    $: if ($onboardingStore && ($currentPlayerGroupIdStore !== undefined || $inJitsiStore || $inLivekitStore)) {
        onboardingStore.skip();
    }

    // Watch for step completion conditions
    $: {
        // Note: lockBubble step completion is handled by click interceptor in OnboardingHighlight
        if ($onboardingStore === "screenSharing" && get(requestedScreenSharingState)) {
            setTimeout(() => onboardingStore.next(), 1000);
        }
        if ($onboardingStore === "pictureInPicture" && get(activePictureInPictureStore)) {
            setTimeout(() => onboardingStore.next(), 1000);
        }
    }
</script>

<OnboardingStep on:next={handleNext} on:skip={handleSkip}>
    {#if $onboardingStore === "welcome"}
        <WelcomeStep on:next={handleNext} on:skip={handleSkip} />
    {:else if $onboardingStore === "movement"}
        <MovementStep on:next={handleNext} />
    {:else if $onboardingStore === "communication"}
        <CommunicationStep on:next={handleNext} />
    {:else if $onboardingStore === "lockBubble"}
        <LockBubbleStep on:next={handleNext} />
    {:else if $onboardingStore === "screenSharing"}
        <ScreenSharingStep on:next={handleNext} />
    {:else if $onboardingStore === "pictureInPicture"}
        <PictureInPictureStep on:next={handleNext} />
    {:else if $onboardingStore === "complete"}
        <CompleteStep on:next={handleNext} />
    {/if}
</OnboardingStep>
<OnboardingHighlight bind:this={onboardingHighlight} />
