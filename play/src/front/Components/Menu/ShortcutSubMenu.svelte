<script lang="ts">
    import { onMount } from "svelte";
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import { isMac } from "../../WebRtc/DeviceUtils";
    import InputSearch from "../Input/InputSearch.svelte";
    import Button from "../UI/Button.svelte";
    import {
        mediaShortcutsStore,
        setMediaShortcut,
        mediaShortcutRebindingStore,
        type MediaShortcut,
        type MediaShortcutAction,
    } from "../../Stores/MediaShortcutStore";

    // join: shown between the keys of one combination ("" = keys pressed separately, e.g. the arrows).
    type Combo = { keys: string[]; join: "" | "+" | "…" };
    // action: the row is a user-rebindable media shortcut.
    type ShortcutRow = { label: string; hint?: string; combos: Combo[]; action?: MediaShortcutAction };
    type ShortcutGroup = { title: string; rows: ShortcutRow[] };
    type Layout = "azerty" | "qwerty";

    // Phaser listens to both ZQSD and WASD; only show the set that matches the user's keyboard.
    let layout: Layout = $state($locale.startsWith("fr") ? "azerty" : "qwerty");
    let query = $state("");
    let rebinding: MediaShortcutAction | undefined = $state();
    let reservedKeyPressed = $state(false);

    function mediaKeys(shortcut: MediaShortcut): string[] {
        return [
            ...(shortcut.ctrlKey ? ["Ctrl"] : []),
            ...(shortcut.metaKey ? ["⌘"] : []),
            ...(shortcut.altKey ? ["Alt"] : []),
            ...(shortcut.shiftKey ? ["Shift"] : []),
            shortcut.key.replace(/^(Key|Digit)/, ""),
        ];
    }

    function startRebinding(action: MediaShortcutAction) {
        rebinding = action;
        reservedKeyPressed = false;
        mediaShortcutRebindingStore.set(true);
    }

    function stopRebinding() {
        rebinding = undefined;
        mediaShortcutRebindingStore.set(false);
    }

    function handleWindowKeydown(event: KeyboardEvent) {
        if (!rebinding) return;
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") {
            stopRebinding();
            return;
        }
        if (["Control", "Alt", "Shift", "Meta"].includes(event.key)) return;
        reservedKeyPressed = !setMediaShortcut(rebinding, {
            key: event.code,
            ctrlKey: event.ctrlKey,
            altKey: event.altKey,
            shiftKey: event.shiftKey,
            metaKey: event.metaKey,
        });
        if (reservedKeyPressed) return;
        stopRebinding();
    }

    onMount(() => {
        window.addEventListener("keydown", handleWindowKeydown);
        return () => {
            window.removeEventListener("keydown", handleWindowKeydown);
            stopRebinding();
        };
    });

    const single = (...keys: string[]): Combo => ({ keys, join: "+" });
    const range = (from: string, to: string): Combo => ({ keys: [from, to], join: "…" });

    let groups: ShortcutGroup[] = $derived.by(() => {
        const t = $LL.menu.shortcuts;
        const move = layout === "azerty" ? ["Z", "Q", "S", "D"] : ["W", "A", "S", "D"];
        return [
            {
                title: t.groups.move(),
                rows: [
                    {
                        label: t.walk(),
                        combos: [
                            { keys: move, join: "" },
                            { keys: ["↑", "←", "↓", "→"], join: "" },
                        ],
                    },
                    { label: t.speedUp(), hint: t.hints.speedUp(), combos: [single(t.keyNames.shift())] },
                    { label: t.walkMyDesk(), combos: [single(isMac() ? "⌘" : "Ctrl", "D")] },
                    { label: t.follow(), hint: t.hints.follow(), combos: [single("F")] },
                ],
            },
            {
                title: t.groups.communicate(),
                rows: [
                    {
                        label: t.toggleMicrophone(),
                        action: "microphone",
                        combos: [single(...mediaKeys($mediaShortcutsStore.microphone))],
                    },
                    {
                        label: t.toggleCamera(),
                        action: "camera",
                        combos: [single(...mediaKeys($mediaShortcutsStore.camera))],
                    },
                    { label: t.openChat(), combos: [single("C")] },
                    { label: t.openUserList(), combos: [single("U")] },
                    { label: t.openSayPopup(), combos: [single(t.keyNames.enter())] },
                    { label: t.openThinkPopup(), combos: [single("Ctrl", t.keyNames.enter())] },
                ],
            },
            {
                title: t.groups.express(),
                rows: [
                    { label: t.sendEmote(), hint: t.hints.emotes(), combos: [range("1", "6"), range("F1", "F6")] },
                    { label: t.rotatePlayer(), combos: [single("R")] },
                ],
            },
            {
                title: t.groups.interact(),
                rows: [
                    { label: t.interact(), combos: [single(t.keyNames.space())] },
                    { label: t.toggleMapEditor(), hint: t.hints.mapEditor(), combos: [single("E")] },
                ],
            },
        ];
    });

    let filteredGroups = $derived.by(() => {
        const q = query.trim().toLowerCase();
        if (!q) return groups;
        return groups
            .map((group) => ({
                ...group,
                rows: group.rows.filter((row) =>
                    [group.title, row.label, ...row.combos.flatMap((combo) => combo.keys)]
                        .join(" ")
                        .toLowerCase()
                        .includes(q),
                ),
            }))
            .filter((group) => group.rows.length > 0);
    });
</script>

{#snippet combos(row: ShortcutRow)}
    {#each row.combos as combo, comboIndex (comboIndex)}
        {#if comboIndex > 0}
            <span class="text-white/70 text-sm px-1">{$LL.menu.shortcuts.or()}</span>
        {/if}
        {#each combo.keys as key, keyIndex (keyIndex)}
            {#if keyIndex > 0 && combo.join}
                <span class="text-white/70 text-sm">{combo.join}</span>
            {/if}
            <kbd
                class="min-w-8 h-8 px-2 inline-flex items-center justify-center rounded-md bg-white/15 border border-solid border-white/20 border-b-[3px] text-white text-sm font-bold font-mono"
            >
                {key}
            </kbd>
        {/each}
    {/each}
{/snippet}

<div class="customize-main">
    <div class="submenu p-4 flex flex-col gap-4">
        <div>
            <h2 class="text-white text-lg font-semibold m-0">{$LL.menu.shortcuts.title()}</h2>
            <p class="text-white/70 text-sm m-0 mt-1">{$LL.menu.shortcuts.subtitle()}</p>
        </div>

        <div class="flex flex-wrap items-center gap-3">
            <InputSearch
                type="search"
                size="lg"
                class="grow min-w-[16rem]"
                placeholder={$LL.menu.shortcuts.searchPlaceholder()}
                aria-label={$LL.menu.shortcuts.searchLabel()}
                dataTestId="shortcuts-search"
                bind:value={query}
            />
            <div role="group" aria-label={$LL.menu.shortcuts.layout()} class="flex gap-1">
                {#each ["azerty", "qwerty"] as const as option (option)}
                    <Button
                        size="sm"
                        variant={layout === option ? "secondary" : "neutral"}
                        appearance={layout === option ? "filled" : "ghost"}
                        aria-pressed={layout === option}
                        onclick={() => (layout = option)}
                    >
                        {option.toUpperCase()}
                    </Button>
                {/each}
            </div>
        </div>

        {#if filteredGroups.length === 0}
            <p class="text-white/70 text-center p-6 m-0 rounded-2xl bg-contrast/80">
                {$LL.menu.shortcuts.noResult({ query })}
            </p>
        {:else}
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 items-start">
                {#each filteredGroups as group (group.title)}
                    <section class="rounded-2xl bg-contrast/80 border border-solid border-white/10 px-4 py-3">
                        <h3 class="text-white text-base font-bold m-0 pb-2">{group.title}</h3>
                        <ul class="list-none m-0 p-0">
                            {#each group.rows as row (row.label)}
                                <li
                                    class="flex items-center justify-between gap-4 min-h-12 border-0 border-t border-solid border-white/10"
                                >
                                    <div class="flex flex-col min-w-0">
                                        <span class="text-white">{row.label}</span>
                                        {#if row.hint}
                                            <span class="text-white/70 text-xs">{row.hint}</span>
                                        {/if}
                                    </div>
                                    {#if row.action}
                                        {@const action = row.action}
                                        <button
                                            class="flex items-center gap-1 shrink-0 p-0 bg-transparent border-0 cursor-pointer"
                                            title={$LL.menu.shortcuts.setShortcut()}
                                            aria-label={$LL.menu.shortcuts.setShortcut()}
                                            onclick={() => startRebinding(action)}
                                        >
                                            {#if rebinding === action}
                                                <span class="text-white/70 text-sm"
                                                    >{reservedKeyPressed
                                                        ? $LL.menu.shortcuts.reservedKey()
                                                        : $LL.menu.shortcuts.pressKey()}</span
                                                >
                                            {:else}
                                                {@render combos(row)}
                                            {/if}
                                        </button>
                                    {:else}
                                        <div class="flex items-center gap-1 shrink-0">{@render combos(row)}</div>
                                    {/if}
                                </li>
                            {/each}
                        </ul>
                    </section>
                {/each}
            </div>
        {/if}
    </div>
</div>
