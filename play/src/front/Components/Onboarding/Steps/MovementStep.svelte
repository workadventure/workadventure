<script lang="ts">
    import { createEventDispatcher, onMount, onDestroy } from "svelte";
    import { fly } from "svelte/transition";
    import LL from "../../../../i18n/i18n-svelte";
    import { isMobileOnboarding, pressedKeysStore } from "../../../Stores/OnboardingStore";
    import { touchScreenManager } from "../../../Touch/TouchScreenManager";

    const dispatch = createEventDispatcher<{
        next: void;
    }>();

    let keyboardLayout: "QWERTY" | "AZERTY" = "QWERTY";

    // Map keyboard codes to actual keys based on layout
    // We detect the layout by checking what key is pressed for KeyW
    const getKeyLabel = (code: string): string => {
        switch (code) {
            case "KeyW":
                return keyboardLayout === "AZERTY" ? "Z" : "W";
            case "KeyA":
                return keyboardLayout === "AZERTY" ? "Q" : "A";
            case "KeyS":
                return "S"; // Same in both layouts
            case "KeyD":
                return "D"; // Same in both layouts
            case "ArrowUp":
                return "↑";
            case "ArrowLeft":
                return "←";
            case "ArrowDown":
                return "↓";
            case "ArrowRight":
                return "→";
            default:
                return "";
        }
    };

    // Detect keyboard layout based on the actual key pressed
    function detectKeyboardLayout(event: KeyboardEvent) {
        // KeyW in QWERTY = "w", in AZERTY = "z"
        if (event.code === "KeyW") {
            if (event.key.toLowerCase() === "z") {
                keyboardLayout = "AZERTY";
            } else if (event.key.toLowerCase() === "w") {
                keyboardLayout = "QWERTY";
            }
        }
        // KeyA in QWERTY = "a", in AZERTY = "q"
        else if (event.code === "KeyA") {
            if (event.key.toLowerCase() === "q") {
                keyboardLayout = "AZERTY";
            } else if (event.key.toLowerCase() === "a") {
                keyboardLayout = "QWERTY";
            }
        }
    }

    function handleKeyDown(event: KeyboardEvent) {
        // Detect layout on first key press
        detectKeyboardLayout(event);

        const keyLabel = getKeyLabel(event.code);
        if (keyLabel) {
            pressedKeysStore.update((keys) => new Set(keys).add(event.code));
        }
    }

    function handleKeyUp(event: KeyboardEvent) {
        const keyLabel = getKeyLabel(event.code);
        if (keyLabel) {
            pressedKeysStore.update((keys) => {
                const next = new Set(keys);
                next.delete(event.code);
                return next;
            });
        }
    }

    onMount(() => {
        // Use capture phase so we receive events before Phaser/game captures them
        window.addEventListener("keydown", handleKeyDown, true);
        window.addEventListener("keyup", handleKeyUp, true);
    });

    onDestroy(() => {
        window.removeEventListener("keydown", handleKeyDown, true);
        window.removeEventListener("keyup", handleKeyUp, true);
        pressedKeysStore.set(new Set());
    });

    function handleNext() {
        dispatch("next");
    }
</script>

<!-- Mobile onboarding: panel at top so user sees joystick and character. Desktop: panel on the right. -->
<div
    class="z-[3001] pointer-events-auto {$isMobileOnboarding
        ? 'fixed left-4 right-4 top-4'
        : 'fixed top-1/2 -right-10 transform -translate-x-14 -translate-y-1/2'}"
>
    <div
        class="bg-contrast/90 backdrop-blur-lg rounded-xl p-4 sm:p-6 w-full max-w-lg shadow-2xl border border-white/20 {$isMobileOnboarding
            ? 'mx-auto max-h-[35vh] overflow-y-auto'
            : ''}"
        in:fly={{ y: $isMobileOnboarding ? -10 : 10, duration: 400 }}
    >
        <div class="space-y-4">
            <h3 class="text-lg sm:text-xl font-bold text-white">
                {$LL.onboarding.movement.title()}
            </h3>
            <p class="text-sm text-white/90">
                {$isMobileOnboarding || touchScreenManager.supportTouchScreen
                    ? $LL.onboarding.movement.descriptionMobile()
                    : $LL.onboarding.movement.descriptionDesktop()}
            </p>
            {#if !$isMobileOnboarding && !touchScreenManager.supportTouchScreen}
                <div class="flex items-center gap-2 text-xs text-white/70 flex-wrap">
                    <kbd
                        class="px-2 py-1 bg-white/10 rounded transition-all duration-150 {$pressedKeysStore.has('KeyW')
                            ? 'bg-yellow-400/80 text-black scale-110 shadow-lg'
                            : ''}"
                    >
                        {getKeyLabel("KeyW")}
                    </kbd>
                    <kbd
                        class="px-2 py-1 bg-white/10 rounded transition-all duration-150 {$pressedKeysStore.has('KeyA')
                            ? 'bg-yellow-400/80 text-black scale-110 shadow-lg'
                            : ''}"
                    >
                        {getKeyLabel("KeyA")}
                    </kbd>
                    <kbd
                        class="px-2 py-1 bg-white/10 rounded transition-all duration-150 {$pressedKeysStore.has('KeyS')
                            ? 'bg-yellow-400/80 text-black scale-110 shadow-lg'
                            : ''}"
                    >
                        {getKeyLabel("KeyS")}
                    </kbd>
                    <kbd
                        class="px-2 py-1 bg-white/10 rounded transition-all duration-150 {$pressedKeysStore.has('KeyD')
                            ? 'bg-yellow-400/80 text-black scale-110 shadow-lg'
                            : ''}"
                    >
                        {getKeyLabel("KeyD")}
                    </kbd>
                    <span>or</span>
                    <div class="flex gap-1">
                        <kbd
                            class="px-2 py-1 bg-white/10 rounded transition-all duration-150 {$pressedKeysStore.has(
                                'ArrowUp'
                            )
                                ? 'bg-yellow-400/80 text-black scale-110 shadow-lg'
                                : ''}"
                        >
                            ↑
                        </kbd>
                        <kbd
                            class="px-2 py-1 bg-white/10 rounded transition-all duration-150 {$pressedKeysStore.has(
                                'ArrowLeft'
                            )
                                ? 'bg-yellow-400/80 text-black scale-110 shadow-lg'
                                : ''}"
                        >
                            ←
                        </kbd>
                        <kbd
                            class="px-2 py-1 bg-white/10 rounded transition-all duration-150 {$pressedKeysStore.has(
                                'ArrowDown'
                            )
                                ? 'bg-yellow-400/80 text-black scale-110 shadow-lg'
                                : ''}"
                        >
                            ↓
                        </kbd>
                        <kbd
                            class="px-2 py-1 bg-white/10 rounded transition-all duration-150 {$pressedKeysStore.has(
                                'ArrowRight'
                            )
                                ? 'bg-yellow-400/80 text-black scale-110 shadow-lg'
                                : ''}"
                        >
                            →
                        </kbd>
                    </div>
                </div>
            {/if}
            <button
                class="mt-4 px-4 py-2 bg-secondary hover:bg-secondary-600 text-white rounded-lg font-semibold transition-all"
                on:click={handleNext}
            >
                {$LL.onboarding.movement.next()}
            </button>
        </div>
    </div>
</div>
