<script lang="ts" module>
    // One chat menu open at a time. The "…" button stops its click, so an open menu never sees that click as
    // outside: opening a menu closes the other one itself.
    let closeOpenMenu: (() => void) | undefined;
</script>

<script lang="ts">
    import { tick, type Snippet } from "svelte";
    import { IconDots } from "@wa-icons";

    interface Props {
        /** Accessible name of the "…" button, e.g. "Options for general". */
        label: string;
        buttonClass: string;
        menuClass: string;
        iconSize?: string;
        dataTestId?: string;
        onopen?: () => void;
        /** Menu items: RoomOption buttons (role="menuitem"). Activating one closes the menu. */
        children: Snippet;
    }

    let { label, buttonClass, menuClass, iconSize = "16", dataTestId, onopen, children }: Props = $props();

    let open = $state(false);
    let button: HTMLButtonElement | undefined = $state();
    let menu: HTMLDivElement | undefined = $state();

    function items(): HTMLElement[] {
        return menu ? Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]:not([disabled])')) : [];
    }

    const closeThisMenu = () => close(false);

    async function openMenu(focusFirstItem: boolean) {
        if (closeOpenMenu !== closeThisMenu) closeOpenMenu?.();
        closeOpenMenu = closeThisMenu;
        open = true;
        onopen?.();
        await tick();
        if (focusFirstItem) items()[0]?.focus();
    }

    function close(focusButton: boolean) {
        if (closeOpenMenu === closeThisMenu) closeOpenMenu = undefined;
        open = false;
        if (focusButton) button?.focus();
    }

    function toggle(event: MouseEvent) {
        event.preventDefault();
        event.stopPropagation();
        if (open) {
            close(false);
        } else {
            // A keyboard "click" (Enter, Space) has detail 0: move into the menu, like a native one.
            openMenu(event.detail === 0).catch((error) => console.error(error));
        }
    }

    function onButtonKeyDown(event: KeyboardEvent) {
        if (event.key === "ArrowDown" && !open) {
            event.preventDefault();
            openMenu(true).catch((error) => console.error(error));
        }
    }

    // preventDefault on every handled key: the game ignores those, so arrows never walk the Woka.
    function onMenuKeyDown(event: KeyboardEvent) {
        const list = items();
        const index = list.indexOf(document.activeElement as HTMLElement);
        switch (event.key) {
            case "ArrowDown":
                list[(index + 1) % list.length]?.focus();
                break;
            case "ArrowUp":
                list[(index - 1 + list.length) % list.length]?.focus();
                break;
            case "Home":
                list[0]?.focus();
                break;
            case "End":
                list[list.length - 1]?.focus();
                break;
            case "Escape":
                close(true);
                break;
            // Tab cycles through the items instead of leaving: Escape is the way out, back to "…".
            case "Tab":
                list[(index + (event.shiftKey ? -1 : 1) + list.length) % list.length]?.focus();
                break;
            default:
                return;
        }
        event.preventDefault();
        event.stopPropagation();
    }

    $effect(() => {
        if (!open) return;
        const closeOnClickOutside = (event: MouseEvent) => {
            const target = event.target;
            if (target instanceof Node && !button?.contains(target) && !menu?.contains(target)) {
                close(false);
            }
        };
        document.addEventListener("click", closeOnClickOutside);
        return () => {
            document.removeEventListener("click", closeOnClickOutside);
            // A menu removed while open (its row scrolled away, its room left) must not stay the open one.
            if (closeOpenMenu === closeThisMenu) closeOpenMenu = undefined;
        };
    });
</script>

<button
    type="button"
    data-testid={dataTestId}
    data-chat-menu-button
    bind:this={button}
    aria-label={label}
    title={label}
    aria-haspopup="menu"
    aria-expanded={open}
    onclick={toggle}
    onkeydown={onButtonKeyDown}
    class="{buttonClass} {open ? 'bg-white/10' : ''}"
>
    <IconDots font-size={iconSize} />
</button>
<!-- svelte-ignore a11y_interactive_supports_focus -->
<div
    bind:this={menu}
    role="menu"
    aria-label={label}
    class="absolute {menuClass}"
    class:hidden={!open}
    onkeydown={onMenuKeyDown}
    onclickcapture={(event) => {
        if (event.target instanceof Element && event.target.closest('[role="menuitem"]')) close(false);
    }}
>
    {@render children()}
</div>
