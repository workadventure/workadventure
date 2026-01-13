<script lang="ts">
    import { onMount, onDestroy } from "svelte";
    import { onboardingStore, type OnboardingStep } from "../../Stores/OnboardingStore";
    import { gameManager } from "../../Phaser/Game/GameManager";
    import { hasMovedEventName } from "../../Phaser/Player/Player";
    import { currentPlayerGroupLockStateStore } from "../../Stores/CurrentPlayerGroupStore";
    import { requestedScreenSharingState } from "../../Stores/ScreenSharingStore";
    import { activePictureInPictureStore } from "../../Stores/PeerStore";
    import { get } from "svelte/store";
    import OnboardingStep from "./OnboardingStep.svelte";
    import OnboardingHighlight from "./OnboardingHighlight.svelte";
    import WelcomeStep from "./Steps/WelcomeStep.svelte";
    import MovementStep from "./Steps/MovementStep.svelte";
    import CommunicationStep from "./Steps/CommunicationStep.svelte";
    import LockBubbleStep from "./Steps/LockBubbleStep.svelte";
    import ScreenSharingStep from "./Steps/ScreenSharingStep.svelte";
    import PictureInPictureStep from "./Steps/PictureInPictureStep.svelte";
    import CompleteStep from "./Steps/CompleteStep.svelte";

    let currentStep: OnboardingStep = null;
    let movementDetected = false;
    let movementTimeout: NodeJS.Timeout | null = null;

    $: currentStep = $onboardingStore;

    onMount(() => {
        // Listen to player movement for step 2
        const scene = gameManager.getCurrentGameScene();
        const currentPlayer = scene?.CurrentPlayer;
        if (currentPlayer) {
            currentPlayer.on(hasMovedEventName, handlePlayerMove);
        }

        // Auto-start onboarding if not completed (with a small delay to ensure scene is loaded)
        setTimeout(() => {
            if (!$onboardingStore && !onboardingStore.isCompleted()) {
                onboardingStore.start();
            }
        }, 1000);
    });

    onDestroy(() => {
        const currentPlayer = gameManager.getCurrentGameScene()?.CurrentPlayer;
        if (currentPlayer) {
            currentPlayer.off(hasMovedEventName, handlePlayerMove);
        }
        if (movementTimeout) {
            clearTimeout(movementTimeout);
        }
    });

    function handlePlayerMove() {
        if (currentStep === "movement" && !movementDetected) {
            movementDetected = true;
            // Wait 2 seconds after movement before auto-advancing
            if (movementTimeout) {
                clearTimeout(movementTimeout);
            }
            movementTimeout = setTimeout(() => {
                onboardingStore.next();
            }, 2000);
        }
    }

    function handleNext() {
        onboardingStore.next();
        movementDetected = false;
    }

    function handleSkip() {
        onboardingStore.skip();
    }

    // Watch for step completion conditions
    $: {
        if (currentStep === "lockBubble" && get(currentPlayerGroupLockStateStore)) {
            setTimeout(() => onboardingStore.next(), 1000);
        }
        if (currentStep === "screenSharing" && get(requestedScreenSharingState)) {
            setTimeout(() => onboardingStore.next(), 1000);
        }
        if (currentStep === "pictureInPicture" && get(activePictureInPictureStore)) {
            setTimeout(() => onboardingStore.next(), 1000);
        }
    }
</script>

{#if currentStep}
    <OnboardingStep
        {currentStep}
        on:next={handleNext}
        on:skip={handleSkip}
    >
        {#if currentStep === "welcome"}
            <WelcomeStep on:next={handleNext} />
        {:else if currentStep === "movement"}
            <MovementStep on:next={handleNext} />
            <OnboardingHighlight type="player" />
        {:else if currentStep === "communication"}
            <CommunicationStep on:next={handleNext} />
            <OnboardingHighlight type="bubble" />
        {:else if currentStep === "lockBubble"}
            <LockBubbleStep on:next={handleNext} />
            <OnboardingHighlight type="lockButton" />
        {:else if currentStep === "screenSharing"}
            <ScreenSharingStep on:next={handleNext} />
            <OnboardingHighlight type="screenShareButton" />
        {:else if currentStep === "pictureInPicture"}
            <PictureInPictureStep on:next={handleNext} />
            <OnboardingHighlight type="pictureInPictureButton" />
        {:else if currentStep === "complete"}
            <CompleteStep on:next={handleNext} />
        {/if}
    </OnboardingStep>
{/if}
