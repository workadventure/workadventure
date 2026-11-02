import { derived, get, writable } from "svelte/store";
import { z } from "zod";

// Shortcuts the user can rebind. Moving, running, interacting, the say/think bubbles and the emotes stay fixed:
// Phaser polls the movement keys every frame and Space/Enter have listeners of their own.
export const editableShortcutActions = [
    "walkMyDesk",
    "follow",
    "openChat",
    "openUserList",
    "rotatePlayer",
    "toggleMapEditor",
] as const;
export type ShortcutAction = (typeof editableShortcutActions)[number];

const keyBindingSchema = z.object({
    // KeyboardEvent.code: matching on the physical key keeps a binding working whatever the layout.
    code: z.string(),
    // What the key printed when it was recorded, for display only.
    label: z.string(),
    // Ctrl or ⌘: the handlers accept either.
    mod: z.boolean(),
    alt: z.boolean(),
    shift: z.boolean(),
});
export type KeyBinding = z.infer<typeof keyBindingSchema>;

const plainKey = (code: string, label: string, mod = false): KeyBinding => ({
    code,
    label,
    mod,
    alt: false,
    shift: false,
});

export const defaultShortcuts: Record<ShortcutAction, KeyBinding> = {
    walkMyDesk: plainKey("KeyD", "D", true),
    follow: plainKey("KeyF", "F"),
    openChat: plainKey("KeyC", "C"),
    openUserList: plainKey("KeyU", "U"),
    rotatePlayer: plainKey("KeyR", "R"),
    toggleMapEditor: plainKey("KeyE", "E"),
};

// null = the user left the action without a shortcut.
type ShortcutOverrides = Partial<Record<ShortcutAction, KeyBinding | null>>;

const storageKey = "keyboardShortcuts";
const overridesSchema = z.record(z.string(), keyBindingSchema.nullable());

function isShortcutAction(action: string): action is ShortcutAction {
    return (editableShortcutActions as readonly string[]).includes(action);
}

function loadOverrides(): ShortcutOverrides {
    try {
        const parsed = overridesSchema.safeParse(JSON.parse(localStorage.getItem(storageKey) ?? "{}"));
        if (!parsed.success) return {};
        return Object.fromEntries(Object.entries(parsed.data).filter(([action]) => isShortcutAction(action)));
    } catch {
        return {};
    }
}

function createShortcutOverridesStore() {
    const { subscribe, update } = writable<ShortcutOverrides>(loadOverrides());
    const save = (overrides: ShortcutOverrides): ShortcutOverrides => {
        localStorage.setItem(storageKey, JSON.stringify(overrides));
        return overrides;
    };
    return {
        subscribe,
        // `takenFrom` loses its shortcut: the user chose to move the key over.
        assign(action: ShortcutAction, binding: KeyBinding, takenFrom?: ShortcutAction) {
            update((overrides) =>
                save({ ...overrides, ...(takenFrom ? { [takenFrom]: null } : {}), [action]: binding }),
            );
        },
        reset(action: ShortcutAction) {
            update((overrides) => {
                const { [action]: _reset, ...rest } = overrides;
                return save(rest);
            });
        },
        resetAll() {
            update(() => save({}));
        },
    };
}

export const shortcutOverridesStore = createShortcutOverridesStore();

export const shortcutsStore = derived(
    shortcutOverridesStore,
    (overrides): Record<ShortcutAction, KeyBinding | null> => ({ ...defaultShortcuts, ...overrides }),
);

const modifierKeys = ["Control", "Meta", "Alt", "Shift", "AltGraph", "CapsLock"];

export function bindingFromEvent(event: KeyboardEvent): KeyBinding | null {
    if (modifierKeys.includes(event.key) || !event.code) return null;
    // Alt changes the printed character on macOS (⌥T = †): fall back to the physical key then.
    const printed = event.key.length === 1 && !event.altKey ? event.key.toUpperCase() : undefined;
    const label = printed ?? event.code.replace(/^(Key|Digit)/, "");
    return { code: event.code, label, mod: event.ctrlKey || event.metaKey, alt: event.altKey, shift: event.shiftKey };
}

export function sameBinding(a: KeyBinding, b: KeyBinding): boolean {
    return a.code === b.code && a.mod === b.mod && a.alt === b.alt && a.shift === b.shift;
}

export function findShortcutAction(event: KeyboardEvent): ShortcutAction | undefined {
    const binding = bindingFromEvent(event);
    if (!binding) return undefined;
    const shortcuts = get(shortcutsStore);
    return editableShortcutActions.find((action) => {
        const bound = shortcuts[action];
        return bound !== null && sameBinding(bound, binding);
    });
}

export type FixedShortcut = "walk" | "interact" | "openSayPopup" | "openThinkPopup" | "sendEmote";

const movementCodes = [
    "KeyW",
    "KeyA",
    "KeyS",
    "KeyD",
    "KeyZ",
    "KeyQ",
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
];
const emoteCodes = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "F1", "F2", "F3", "F4", "F5", "F6"];

// The fixed shortcut a binding would collide with, if any.
export function fixedShortcutFor(binding: KeyBinding): FixedShortcut | undefined {
    const plain = !binding.mod && !binding.alt && !binding.shift;
    if (binding.code === "Enter" && !binding.alt && !binding.shift)
        return binding.mod ? "openThinkPopup" : "openSayPopup";
    if (!plain) return undefined;
    if (movementCodes.includes(binding.code)) return "walk";
    if (binding.code === "Space") return "interact";
    if (emoteCodes.includes(binding.code)) return "sendEmote";
    return undefined;
}

const browserReservedMod = ["KeyW", "KeyT", "KeyN", "KeyR", "KeyL", "KeyQ"];

// Keys the browser keeps for itself (or that move the focus): binding them would never reach the game.
export function isBrowserReserved(binding: KeyBinding): boolean {
    if (binding.code === "Tab" || binding.code === "Escape" || binding.code === "F5") return true;
    return binding.mod && !binding.alt && browserReservedMod.includes(binding.code);
}
