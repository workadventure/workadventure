<script lang="ts">
    import { onDestroy } from "svelte";
    import { fade, scale } from "svelte/transition";
    import LL from "../../../i18n/i18n-svelte";
    import { WOKA_EMOTES } from "../../Phaser/Game/Emote/WokaEmoteCatalog";
    import { wheelSliceAt, wheelSlicePosition } from "../../Phaser/Game/Emote/WokaEmoteGeometry";
    import { enableUserInputsStore } from "../../Stores/UserInputStore";
    import { playWokaEmote, wokaEmoteWheelVisibleStore } from "../../Stores/WokaEmoteStore";
    import { getCurrentPlayerScreenPosition } from "../../Utils/GameToBrowserCoordinates";

    /** Distance from the centre to the middle of a slice, in pixels. */
    const RADIUS = 112;
    /** Inside this radius the pointer selects nothing, so the wheel can be dismissed by aiming at its centre. */
    const DEAD_ZONE = 48;
    /** Below this, a press on the shortcut is a tap that leaves the wheel open rather than a hold. */
    const HOLD_THRESHOLD = 250;
    // "e" toggles the map editor; "g" for gesture is free in both keyboard layouts.
    const SHORTCUT = "g";

    /** Half the wheel's footprint, used to keep it clear of the screen edges. */
    const HALF_FOOTPRINT = RADIUS + 48;
    const EDGE_MARGIN = 8;

    let selected: number | null = $state(null);
    let wheelElement: HTMLElement | undefined = $state(undefined);
    let openedWithShortcutAt: number | null = null;
    /** Where the Woka sits on screen. Undefined until the first frame, or when there is no scene. */
    let anchor: { x: number; y: number } | undefined = $state(undefined);
    let trackingFrame: number | undefined;

    // The camera follows the player, but not exactly: it stops at the edges of the map, and a
    // cowebsite shrinks the canvas. Centring on the viewport would leave the wheel off the Woka in
    // both cases, so it is anchored to the Woka itself and clamped to stay fully on screen.
    function trackWoka(): void {
        const position = getCurrentPlayerScreenPosition();
        anchor = position
            ? {
                  x: Math.min(
                      Math.max(position.x, HALF_FOOTPRINT + EDGE_MARGIN),
                      window.innerWidth - HALF_FOOTPRINT - EDGE_MARGIN,
                  ),
                  y: Math.min(
                      Math.max(position.y, HALF_FOOTPRINT + EDGE_MARGIN),
                      window.innerHeight - HALF_FOOTPRINT - EDGE_MARGIN,
                  ),
              }
            : undefined;
        trackingFrame = requestAnimationFrame(trackWoka);
    }

    function startTracking(): void {
        if (trackingFrame === undefined) {
            trackWoka();
        }
    }

    function stopTracking(): void {
        if (trackingFrame !== undefined) {
            cancelAnimationFrame(trackingFrame);
            trackingFrame = undefined;
        }
        anchor = undefined;
    }

    onDestroy(stopTracking);

    const items = $derived(
        WOKA_EMOTES.map((definition) => ({
            definition,
            label: {
                jump: $LL.actionbar.wokaEmote.names.jump(),
                spin: $LL.actionbar.wokaEmote.names.spin(),
                dance: $LL.actionbar.wokaEmote.names.dance(),
                celebrate: $LL.actionbar.wokaEmote.names.celebrate(),
                nope: $LL.actionbar.wokaEmote.names.nope(),
                love: $LL.actionbar.wokaEmote.names.love(),
                afk: $LL.actionbar.wokaEmote.names.afk(),
            }[definition.id],
        })),
    );

    function open(withShortcut: boolean): void {
        openedWithShortcutAt = withShortcut ? Date.now() : null;
        selected = null;
        startTracking();
        wokaEmoteWheelVisibleStore.set(true);
    }

    function close(): void {
        openedWithShortcutAt = null;
        selected = null;
        stopTracking();
        wokaEmoteWheelVisibleStore.set(false);
    }

    function play(index: number | null): void {
        if (index === null) {
            close();
            return;
        }
        playWokaEmote(WOKA_EMOTES[index].id);
        openedWithShortcutAt = null;
        selected = null;
        stopTracking();
    }

    /** Turns the pointer position into the slice it is aiming at. */
    function onPointerMove(event: PointerEvent): void {
        if (!wheelElement) return;
        const bounds = wheelElement.getBoundingClientRect();
        const dx = event.clientX - (bounds.left + bounds.width / 2);
        const dy = event.clientY - (bounds.top + bounds.height / 2);
        selected = wheelSliceAt(dx, dy, WOKA_EMOTES.length, DEAD_ZONE);
    }

    function isTyping(target: EventTarget | null): boolean {
        if (!(target instanceof HTMLElement)) return false;
        return target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName);
    }

    function onWindowKeyDown(event: KeyboardEvent): void {
        if (event.repeat || isTyping(event.target) || event.ctrlKey || event.metaKey || event.altKey) return;

        if (!$wokaEmoteWheelVisibleStore) {
            // Opening is the only thing the shortcut may do while the game has the keyboard.
            if (event.key.toLowerCase() === SHORTCUT && $enableUserInputsStore) {
                event.preventDefault();
                open(true);
            }
            return;
        }

        switch (event.key) {
            case "Escape":
                event.preventDefault();
                close();
                break;
            case "ArrowRight":
            case "ArrowDown":
                event.preventDefault();
                selected = selected === null ? 0 : (selected + 1) % WOKA_EMOTES.length;
                break;
            case "ArrowLeft":
            case "ArrowUp":
                event.preventDefault();
                selected =
                    selected === null
                        ? WOKA_EMOTES.length - 1
                        : (selected - 1 + WOKA_EMOTES.length) % WOKA_EMOTES.length;
                break;
            case "Enter":
            case " ":
                event.preventDefault();
                play(selected);
                break;
            default: {
                const digit = Number(event.key);
                if (Number.isInteger(digit) && digit >= 1 && digit <= WOKA_EMOTES.length) {
                    event.preventDefault();
                    play(digit - 1);
                }
            }
        }
    }

    function onWindowKeyUp(event: KeyboardEvent): void {
        if (event.key.toLowerCase() !== SHORTCUT || openedWithShortcutAt === null) return;
        // A quick tap leaves the wheel open to be clicked; holding it makes the release the choice.
        if (Date.now() - openedWithShortcutAt >= HOLD_THRESHOLD) {
            play(selected);
        }
        openedWithShortcutAt = null;
    }
</script>

<svelte:window onkeydown={onWindowKeyDown} onkeyup={onWindowKeyUp} />

{#if $wokaEmoteWheelVisibleStore}
    <!-- The wheel is driven from the keyboard at window level (Escape, arrows, Enter, digits);
         these handlers only add pointer aiming on top of that. -->
    <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_noninteractive_element_interactions -->
    <div
        class="fixed inset-0 z-[600] pointer-events-auto"
        transition:fade={{ duration: 120 }}
        onpointermove={onPointerMove}
        onclick={() => play(selected)}
        role="dialog"
        aria-modal="true"
        tabindex="-1"
        aria-label={$LL.actionbar.wokaEmote.wheelTitle()}
    >
        <!-- Positioner: sits on the Woka, or on the middle of the screen while it is unknown. -->
        <div
            class="absolute -translate-x-1/2 -translate-y-1/2"
            style={anchor ? `left: ${anchor.x}px; top: ${anchor.y}px;` : "left: 50%; top: 50%;"}
        >
            <div
                bind:this={wheelElement}
                class="relative"
                style="width: {RADIUS * 2 + 96}px; height: {RADIUS * 2 + 96}px;"
                transition:scale={{ duration: 140, start: 0.85 }}
            >
                <!-- Under the ring, not in the middle of it: the middle is where the Woka stands. -->
                <div
                    class="absolute left-1/2 top-full -translate-x-1/2 -mt-1 whitespace-nowrap rounded-sm
                           bg-contrast/80 px-2 py-1 text-center text-white/80 text-xs select-none"
                >
                    {selected === null ? $LL.actionbar.wokaEmote.hint() : items[selected].label}
                </div>

                {#each items as item, index (item.definition.id)}
                    {@const position = wheelSlicePosition(index, WOKA_EMOTES.length, RADIUS)}
                    <button
                        type="button"
                        class="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center
                           justify-center gap-0.5 rounded-full border transition-all duration-150 pointer-events-auto
                           {selected === index
                            ? 'border-white bg-secondary scale-110'
                            : 'border-white/20 bg-contrast/80 hover:border-white/60'}"
                        style="margin-left: {position.x}px; margin-top: {position.y}px;"
                        data-testid="woka-emote-{item.definition.id}"
                        aria-label={item.label}
                        aria-pressed={selected === index}
                        onmouseenter={() => (selected = index)}
                        onfocus={() => (selected = index)}
                        onclick={(event) => {
                            event.stopPropagation();
                            play(index);
                        }}
                    >
                        <span class="text-2xl leading-none">{item.definition.icon}</span>
                        <span class="text-white/50 text-[10px] leading-none">{index + 1}</span>
                    </button>
                {/each}
            </div>
        </div>
    </div>
{/if}
