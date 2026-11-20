<script lang="ts">
    import { onDestroy } from "svelte";
    import { fade } from "svelte/transition";
    import LL from "../../../i18n/i18n-svelte";
    import { WOKA_EMOTE_FAMILIES, WOKA_EMOTES } from "../../Phaser/Game/Emote/WokaEmoteCatalog";
    import { wheelSectorPath, wheelSliceAt, wheelSlicePosition } from "../../Phaser/Game/Emote/WokaEmoteGeometry";
    import { enableUserInputsStore } from "../../Stores/UserInputStore";
    import { playWokaEmote, wokaEmotePreviewStore, wokaEmoteWheelVisibleStore } from "../../Stores/WokaEmoteStore";
    import { getCurrentPlayerScreenPosition } from "../../Utils/GameToBrowserCoordinates";
    import { wokaEmoteFamilyColors, wokaEmoteIcons } from "./wokaEmoteIcons";

    /** Outer edge of the ring, in pixels: the labels need room inside each slice. */
    const MAX_RADIUS = 180;
    /** Never wider than the screen it opens on. */
    const MIN_RADIUS = 116;
    /** Inside this radius the pointer selects nothing, so the wheel can be dismissed by aiming at its centre. */
    const DEAD_ZONE = 48;
    /** Inner edge of the ring: the Woka stands in the hole, previewing the emote being aimed at. */
    const INNER_RADIUS = 52;
    /** Room around the ring for the family names. */
    const LABEL_MARGIN = 22;
    // "e" toggles the map editor; "g" for gesture is free in both keyboard layouts.
    const SHORTCUT = "g";
    /** One key per slice, matched on the physical key so they work on AZERTY without Shift. */
    const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="];
    const KEY_CODES = [...KEYS.slice(0, 10).map((key) => `Digit${key}`), "Minus", "Equal"];

    const EDGE_MARGIN = 8;
    /** Grown or shrunk to fit the viewport; recomputed on every tracking frame, so it follows resizes. */
    let radius = $state(MAX_RADIUS);

    function fittingRadius(): number {
        const smallestSide = Math.min(window.innerWidth, window.innerHeight);
        return Math.max(MIN_RADIUS, Math.min(MAX_RADIUS, smallestSide / 2 - LABEL_MARGIN - 16));
    }

    let selected: number | null = $state(null);
    let wheelElement: HTMLElement | undefined = $state(undefined);
    /** Opened by holding G: releasing it is the choice. Opened from the emoji bar, it waits for a click. */
    let openedWithShortcut = $state(false);
    /** Where the Woka sits on screen. Undefined until the first frame, or when there is no scene. */
    let anchor: { x: number; y: number } | undefined = $state(undefined);
    let trackingFrame: number | undefined;
    /** Drives the slices outwards from the Woka when the wheel opens. */
    let deployed = $state(false);

    // The camera follows the player, but not exactly: it stops at the edges of the map, and a
    // cowebsite shrinks the canvas. Centring on the viewport would leave the wheel off the Woka in
    // both cases, so it is anchored to the Woka itself and clamped to stay fully on screen.
    function trackWoka(): void {
        radius = fittingRadius();
        const halfFootprint = radius + LABEL_MARGIN;
        const position = getCurrentPlayerScreenPosition();
        anchor = position
            ? {
                  x: Math.min(
                      Math.max(position.x, halfFootprint + EDGE_MARGIN),
                      window.innerWidth - halfFootprint - EDGE_MARGIN,
                  ),
                  y: Math.min(
                      Math.max(position.y, halfFootprint + EDGE_MARGIN),
                      window.innerHeight - halfFootprint - EDGE_MARGIN,
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
            label: $LL.actionbar.wokaEmote.names[definition.id](),
        })),
    );

    /**
     * Room for a label inside a slice, along the arc at the middle of the ring. Long names ("Auf der
     * Stelle laufen") wrap, and are hyphenated if a single word is too wide; when even that does not fit, on a small screen, the slices
     * show their icon only and the name is read in the caption under the ring.
     */
    /** Content sits past the middle of the ring, where a slice is wider. */
    const contentRadius = $derived((INNER_RADIUS + radius) / 2 + 8);
    const labelWidth = $derived(Math.floor((2 * Math.PI * contentRadius) / WOKA_EMOTES.length) - 6);
    const showLabels = $derived(labelWidth >= 48);

    const familyLabels = $derived({
        react: $LL.actionbar.wokaEmote.families.react(),
        move: $LL.actionbar.wokaEmote.families.move(),
        status: $LL.actionbar.wokaEmote.families.status(),
    });

    /** Each family's name sits outside the ring, at the middle of its arc. */
    const familyArcs = WOKA_EMOTE_FAMILIES.map((family) => {
        const indexes = WOKA_EMOTES.flatMap((emote, index) => (emote.family === family ? [index] : []));
        return { family, middle: (indexes[0] + indexes[indexes.length - 1]) / 2 };
    });

    // What is aimed at plays on our own Woka, in the hole of the ring, before anyone else sees it.
    $effect(() => {
        wokaEmotePreviewStore.set(selected === null ? null : WOKA_EMOTES[selected].id);
    });

    // The wheel is opened from the action bar as well as from the shortcut, so the setup hangs off
    // the store rather than off a local open(). Opened from the button it used to skip this and end
    // up in the middle of the screen with every slice still collapsed on the centre.
    $effect(() => {
        if (!$wokaEmoteWheelVisibleStore) {
            openedWithShortcut = false;
            selected = null;
            deployed = false;
            stopTracking();
            return;
        }
        selected = null;
        deployed = false;
        startTracking();
        // One frame later, so the slices have a collapsed position to travel out from.
        const frame = requestAnimationFrame(() => (deployed = true));
        return () => cancelAnimationFrame(frame);
    });

    function open(withShortcut: boolean): void {
        openedWithShortcut = withShortcut;
        wokaEmoteWheelVisibleStore.set(true);
    }

    function close(): void {
        wokaEmoteWheelVisibleStore.set(false);
    }

    function play(index: number | null): void {
        if (index === null) {
            close();
            return;
        }
        // playWokaEmote closes the wheel itself, which tears the tracking down through the effect.
        playWokaEmote(WOKA_EMOTES[index].id);
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
                const index = KEY_CODES.indexOf(event.code);
                if (index !== -1 && index < WOKA_EMOTES.length) {
                    event.preventDefault();
                    play(index);
                }
            }
        }
    }

    function onWindowKeyUp(event: KeyboardEvent): void {
        if (event.key.toLowerCase() !== SHORTCUT || !openedWithShortcut) return;
        // Released on a slice it plays it; released anywhere else, even mid-opening, it closes.
        play(selected);
        openedWithShortcut = false;
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
                class="relative transition-[transform,opacity] duration-200 ease-out"
                style="width: {(radius + LABEL_MARGIN) * 2}px; height: {(radius + LABEL_MARGIN) * 2}px;
                       transform: scale({deployed ? 1 : 0.4}); opacity: {deployed ? 1 : 0};"
            >
                <svg
                    class="absolute inset-0 overflow-visible pointer-events-none"
                    viewBox="{-(radius + LABEL_MARGIN)} {-(radius + LABEL_MARGIN)} {(radius + LABEL_MARGIN) *
                        2} {(radius + LABEL_MARGIN) * 2}"
                    aria-hidden="true"
                >
                    {#each items as item, index (item.definition.id)}
                        {@const color = wokaEmoteFamilyColors[item.definition.family]}
                        <path
                            d={wheelSectorPath(index, WOKA_EMOTES.length, INNER_RADIUS, radius)}
                            style="fill: {selected === index ? color : 'hsl(var(--contrast) / 0.85)'}"
                            class="transition-[fill] duration-100"
                        />
                        <!-- The family's colour runs along the outer edge, so the arcs read at a glance. -->
                        <path
                            d={wheelSectorPath(index, WOKA_EMOTES.length, radius - 4, radius)}
                            style="fill: {color}"
                        />
                    {/each}
                    {#each familyArcs as arc (arc.family)}
                        {@const position = wheelSlicePosition(arc.middle, WOKA_EMOTES.length, radius + 12)}
                        <text
                            x={position.x}
                            y={position.y + 4}
                            text-anchor={position.x > 1 ? "start" : position.x < -1 ? "end" : "middle"}
                            class="text-[11px] font-bold uppercase tracking-wide"
                            fill="white"
                            style="stroke: {wokaEmoteFamilyColors[arc.family]}"
                            stroke-width="4"
                            paint-order="stroke"
                        >
                            {familyLabels[arc.family]}
                        </text>
                    {/each}
                </svg>

                {#each items as item, index (item.definition.id)}
                    {@const position = wheelSlicePosition(index, WOKA_EMOTES.length, contentRadius)}
                    {@const Icon = wokaEmoteIcons[item.definition.id]}
                    <button
                        type="button"
                        class="absolute left-1/2 top-1/2 flex flex-col items-center gap-0.5 text-white select-none
                               transition-transform duration-100 {selected === index ? 'scale-110' : ''}"
                        style="width: {labelWidth}px; transform: translate(calc(-50% + {position.x}px), calc(-50% +
                            {position.y}px));"
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
                        <Icon font-size="22" />
                        {#if showLabels}
                            <span
                                class="line-clamp-3 w-full text-center text-[10px] leading-tight hyphens-auto [overflow-wrap:anywhere]"
                            >
                                {item.label}
                            </span>
                        {/if}
                        <span class="text-[9px] leading-none text-white/50">{KEYS[index]}</span>
                    </button>
                {/each}

                <!-- Under the ring, not in the middle of it: the middle is where the Woka stands. -->
                <div
                    class="absolute left-1/2 top-full -translate-x-1/2 mt-1 whitespace-nowrap rounded-sm
                           bg-contrast/80 px-2 py-1 text-center text-white/80 text-xs select-none"
                >
                    {#if selected === null}
                        {$LL.actionbar.wokaEmote.hint()}
                    {:else}
                        <b class="text-white">{items[selected].label}</b>
                        {#if openedWithShortcut}· {$LL.actionbar.wokaEmote.release()}{/if}
                    {/if}
                </div>
            </div>
        </div>
    </div>
{/if}
