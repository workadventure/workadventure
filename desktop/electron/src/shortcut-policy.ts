/**
 * The global shortcuts typed in the settings window: a key press becomes an Electron accelerator
 * ("CommandOrControl+Alt+Shift+M", the defaults' form), and an accelerator becomes what the window shows.
 */

export const SHORTCUT_NAMES = ["mute_toggle", "camera_toggle", "companion_toggle"] as const;
export type ShortcutName = (typeof SHORTCUT_NAMES)[number];

type KeyPress = Pick<KeyboardEvent, "key" | "code" | "ctrlKey" | "altKey" | "shiftKey" | "metaKey">;

const NAMED_KEYS: Record<string, string> = {
    Space: "Space",
    Tab: "Tab",
    Enter: "Enter",
    Backspace: "Backspace",
    Delete: "Delete",
    Insert: "Insert",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
};
const KEY_NAMES = new Set(Object.values(NAMED_KEYS));
const MODIFIERS = new Set(["CommandOrControl", "Command", "Control", "Alt", "Shift", "Super"]);
const FUNCTION_KEY = /^F([1-9]|1[0-9]|2[0-4])$/;

function keyOf(press: KeyPress): string | undefined {
    if (/^Key[A-Z]$/.test(press.code)) {
        // The letter on the key, which accelerators name; `code` is the key's place on a US keyboard
        // (Q on a French one gives KeyA). Option on macOS turns the letter into a symbol: then the place.
        return /^[a-z]$/i.test(press.key) ? press.key.toUpperCase() : press.code.slice(3);
    }
    if (/^Digit[0-9]$/.test(press.code)) {
        // Not the key: on a French keyboard the digits need Shift.
        return press.code.slice(5);
    }
    if (/^Numpad[0-9]$/.test(press.code)) {
        return `num${press.code.slice(6)}`;
    }
    if (FUNCTION_KEY.test(press.key)) {
        return press.key;
    }
    return NAMED_KEYS[press.code];
}

/**
 * The accelerator for a key press, "needs-modifier" for a key that would take over normal typing on its
 * own, or undefined while only modifiers are held (and for keys accelerators cannot name).
 */
export function acceleratorFromKeyPress(
    press: KeyPress,
    platform: string
): { accelerator: string } | "needs-modifier" | undefined {
    const key = keyOf(press);
    if (!key) {
        return undefined;
    }
    const mac = platform === "darwin";
    const modifiers = [
        (mac ? press.metaKey : press.ctrlKey) && "CommandOrControl",
        mac && press.ctrlKey && "Control",
        !mac && press.metaKey && "Super",
        press.altKey && "Alt",
        press.shiftKey && "Shift",
    ].filter((modifier): modifier is string => Boolean(modifier));
    if (!FUNCTION_KEY.test(key) && modifiers.every((modifier) => modifier === "Shift")) {
        return "needs-modifier";
    }
    return { accelerator: [...modifiers, key].join("+") };
}

/** What acceleratorFromKeyPress makes: all main accepts from the settings window. */
export function isSettableAccelerator(accelerator: string): boolean {
    const parts = accelerator.split("+");
    const key = parts.pop() ?? "";
    return (
        (/^[A-Z0-9]$/.test(key) || /^num[0-9]$/.test(key) || FUNCTION_KEY.test(key) || KEY_NAMES.has(key)) &&
        parts.every((part) => MODIFIERS.has(part)) &&
        new Set(parts).size === parts.length
    );
}

const MAC_SYMBOLS: Record<string, string> = { Control: "⌃", Alt: "⌥", Shift: "⇧", CommandOrControl: "⌘", Command: "⌘" };
const MAC_ORDER = ["Control", "Alt", "Shift", "CommandOrControl", "Command"];
const OTHER_NAMES: Record<string, string> = { CommandOrControl: "Ctrl", Control: "Ctrl", Super: "Super" };

/** "⌥⇧⌘M" on macOS, "Ctrl+Alt+Shift+M" elsewhere. */
export function acceleratorLabel(accelerator: string, platform: string): string {
    const parts = accelerator.split("+");
    const key = parts.pop() ?? "";
    if (platform === "darwin") {
        const modifiers = [...parts].sort((a, b) => MAC_ORDER.indexOf(a) - MAC_ORDER.indexOf(b));
        return modifiers.map((part) => MAC_SYMBOLS[part] ?? part).join("") + key;
    }
    const superName = platform === "win32" ? "Win" : "Super";
    return [...parts.map((part) => (part === "Super" ? superName : OTHER_NAMES[part] ?? part)), key].join("+");
}
