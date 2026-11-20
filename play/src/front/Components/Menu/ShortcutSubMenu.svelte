<script lang="ts">
    import { LL, locale } from "../../../i18n/i18n-svelte";
    import { isMac } from "../../WebRtc/DeviceUtils";
    import {
        bindingFromEvent,
        editableShortcutActions,
        fixedShortcutFor,
        isBrowserReserved,
        sameBinding,
        shortcutOverridesStore,
        shortcutsStore,
    } from "../../Stores/ShortcutsStore";
    import type { FixedShortcut, KeyBinding, ShortcutAction } from "../../Stores/ShortcutsStore";
    import InputSearch from "../Input/InputSearch.svelte";
    import Button from "../UI/Button.svelte";
    import { IconLock, IconPencil, IconRestore } from "@wa-icons";

    // join: shown between the keys of one combination ("" = keys pressed separately, e.g. the arrows).
    type Combo = { keys: string[]; join: "" | "+" | "…" };
    // Rows with an `action` can be rebound in edit mode; their combos come from the shortcuts store.
    type ShortcutRow = { label: string; hint?: string; combos: Combo[]; action?: ShortcutAction };
    type ShortcutGroup = { title: string; rows: ShortcutRow[] };
    type Layout = "azerty" | "qwerty";
    type Problem = {
        action: ShortcutAction;
        binding: KeyBinding;
        kind: "taken" | "fixed" | "reserved";
        owner?: ShortcutAction;
        fixed?: FixedShortcut;
    };

    // Phaser listens to both ZQSD and WASD; only show the set that matches the user's keyboard.
    let layout: Layout = $state($locale.startsWith("fr") ? "azerty" : "qwerty");
    let query = $state("");
    let editing = $state(false);
    let capturing: ShortcutAction | null = $state(null);
    let problem: Problem | null = $state(null);

    const single = (...keys: string[]): Combo => ({ keys, join: "+" });
    const range = (from: string, to: string): Combo => ({ keys: [from, to], join: "…" });

    function bindingKeys(binding: KeyBinding): string[] {
        return [
            ...(binding.mod ? [isMac() ? "⌘" : "Ctrl"] : []),
            ...(binding.alt ? [isMac() ? "⌥" : "Alt"] : []),
            ...(binding.shift ? [$LL.menu.shortcuts.keyNames.shift()] : []),
            binding.label,
        ];
    }

    let actionLabels: Record<ShortcutAction, string> = $derived({
        walkMyDesk: $LL.menu.shortcuts.walkMyDesk(),
        follow: $LL.menu.shortcuts.follow(),
        openChat: $LL.menu.shortcuts.openChat(),
        openUserList: $LL.menu.shortcuts.openUserList(),
        rotatePlayer: $LL.menu.shortcuts.rotatePlayer(),
        toggleMapEditor: $LL.menu.shortcuts.toggleMapEditor(),
        toggleMicrophone: $LL.menu.shortcuts.toggleMicrophone(),
        toggleCamera: $LL.menu.shortcuts.toggleCamera(),
    });

    let fixedLabels: Record<FixedShortcut, string> = $derived({
        walk: $LL.menu.shortcuts.walk(),
        interact: $LL.menu.shortcuts.interact(),
        openSayPopup: $LL.menu.shortcuts.openSayPopup(),
        openThinkPopup: $LL.menu.shortcuts.openThinkPopup(),
        sendEmote: $LL.menu.shortcuts.sendEmote(),
    });

    function editable(action: ShortcutAction, hint?: string): ShortcutRow {
        const binding = $shortcutsStore[action];
        return { label: actionLabels[action], hint, action, combos: binding ? [single(...bindingKeys(binding))] : [] };
    }

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
                    editable("walkMyDesk"),
                    editable("follow", t.hints.follow()),
                ],
            },
            {
                title: t.groups.communicate(),
                rows: [
                    editable("toggleMicrophone"),
                    editable("toggleCamera"),
                    editable("openChat"),
                    editable("openUserList"),
                    { label: t.openSayPopup(), combos: [single(t.keyNames.enter())] },
                    { label: t.openThinkPopup(), combos: [single("Ctrl", t.keyNames.enter())] },
                ],
            },
            {
                title: t.groups.express(),
                rows: [
                    { label: t.sendEmote(), hint: t.hints.emotes(), combos: [range("1", "6"), range("F1", "F6")] },
                    editable("rotatePlayer"),
                ],
            },
            {
                title: t.groups.interact(),
                rows: [
                    { label: t.interact(), combos: [single(t.keyNames.space())] },
                    editable("toggleMapEditor", t.hints.mapEditor()),
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

    let problemText = $derived.by(() => {
        if (!problem) return "";
        const keys = bindingKeys(problem.binding).join(" + ");
        const t = $LL.menu.shortcuts.edit;
        if (problem.kind === "reserved") return t.reserved({ keys });
        if (problem.kind === "fixed" && problem.fixed)
            return t.usedByFixed({ keys, action: fixedLabels[problem.fixed] });
        return problem.owner ? t.usedBy({ keys, action: actionLabels[problem.owner] }) : "";
    });

    function stopEditing() {
        editing = false;
        capturing = null;
        problem = null;
    }

    function startCapture(action: ShortcutAction) {
        capturing = action;
        problem = null;
    }

    function onCaptureKeyDown(event: KeyboardEvent, action: ShortcutAction) {
        if (capturing !== action) return;
        // The key is for us: neither the game nor the browser should act on it.
        event.preventDefault();
        event.stopPropagation();
        if (event.key === "Escape") {
            capturing = null;
            return;
        }
        const binding = bindingFromEvent(event);
        // A lone modifier: wait for the rest of the combination.
        if (!binding) return;
        capturing = null;

        if (isBrowserReserved(binding)) {
            problem = { action, binding, kind: "reserved" };
            return;
        }
        const fixed = fixedShortcutFor(binding);
        if (fixed) {
            problem = { action, binding, kind: "fixed", fixed };
            return;
        }
        const owner = editableShortcutActions.find((other) => {
            const bound = $shortcutsStore[other];
            return other !== action && bound !== null && sameBinding(bound, binding);
        });
        if (owner) {
            problem = { action, binding, kind: "taken", owner };
            return;
        }
        shortcutOverridesStore.assign(action, binding);
    }

    function replace() {
        if (problem?.kind !== "taken") return;
        shortcutOverridesStore.assign(problem.action, problem.binding, problem.owner);
        problem = null;
    }
</script>

<div class="customize-main">
    <div class="submenu p-4 flex flex-col gap-4">
        <div class="flex items-start justify-between gap-4">
            <div>
                <h2 class="text-white text-lg font-semibold m-0">{$LL.menu.shortcuts.title()}</h2>
                <p class="text-white/70 text-sm m-0 mt-1">{$LL.menu.shortcuts.subtitle()}</p>
            </div>
            {#if !editing}
                <Button variant="secondary" size="sm" dataTestId="shortcuts-edit" onclick={() => (editing = true)}>
                    {#snippet icon()}
                        <IconPencil />
                    {/snippet}
                    {$LL.menu.shortcuts.edit.start()}
                </Button>
            {/if}
        </div>

        {#if editing}
            <div
                role="status"
                class="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-solid border-secondary"
            >
                <div class="flex flex-col grow basis-80">
                    <span class="text-white font-bold">{$LL.menu.shortcuts.edit.title()}</span>
                    <span class="text-white/80 text-sm">{$LL.menu.shortcuts.edit.help()}</span>
                </div>
                <Button variant="light" appearance="border" size="sm" onclick={() => shortcutOverridesStore.resetAll()}>
                    {$LL.menu.shortcuts.edit.resetAll()}
                </Button>
                <Button variant="light" size="sm" dataTestId="shortcuts-edit-done" onclick={stopEditing}>
                    {$LL.menu.shortcuts.edit.done()}
                </Button>
            </div>
        {/if}

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
                                {@const action = row.action}
                                <li class="flex flex-col border-0 border-t border-solid border-white/10">
                                    <div class="flex items-center justify-between gap-4 min-h-12">
                                        <div class="flex flex-col min-w-0">
                                            <span class="text-white flex items-center gap-2">
                                                {row.label}
                                                {#if editing && action && action in $shortcutOverridesStore}
                                                    <span class="text-warning text-xs font-bold uppercase">
                                                        {$LL.menu.shortcuts.edit.modified()}
                                                    </span>
                                                {/if}
                                            </span>
                                            {#if row.hint}
                                                <span class="text-white/70 text-xs">{row.hint}</span>
                                            {/if}
                                        </div>
                                        <div class="flex items-center gap-1 shrink-0">
                                            {#if editing && action}
                                                {@const isCapturing = capturing === action}
                                                <button
                                                    type="button"
                                                    data-testid="shortcut-key-{action}"
                                                    class="min-w-11 h-9 px-3 inline-flex items-center justify-center gap-1 rounded-md border-2 text-sm font-bold cursor-pointer {isCapturing
                                                        ? 'bg-secondary border-solid border-white text-white font-sans'
                                                        : problem?.action === action
                                                          ? 'bg-white/15 border-solid border-warning text-white font-mono'
                                                          : 'bg-white/15 border-dashed border-white/60 text-white font-mono'}"
                                                    aria-label={$LL.menu.shortcuts.edit.change({ action: row.label })}
                                                    onclick={() => startCapture(action)}
                                                    onkeydown={(event) => onCaptureKeyDown(event, action)}
                                                    onblur={() => {
                                                        if (capturing === action) capturing = null;
                                                    }}
                                                >
                                                    {#if isCapturing}
                                                        {$LL.menu.shortcuts.edit.pressKey()}
                                                    {:else if row.combos.length === 0}
                                                        {$LL.menu.shortcuts.edit.none()}
                                                    {:else}
                                                        {row.combos[0].keys.join(" + ")}
                                                    {/if}
                                                </button>
                                                {#if action in $shortcutOverridesStore}
                                                    <Button
                                                        variant="light"
                                                        appearance="ghost"
                                                        size="sm"
                                                        square
                                                        aria-label={$LL.menu.shortcuts.edit.reset({
                                                            action: row.label,
                                                        })}
                                                        onclick={() => {
                                                            shortcutOverridesStore.reset(action);
                                                            problem = null;
                                                        }}
                                                    >
                                                        {#snippet icon()}
                                                            <IconRestore />
                                                        {/snippet}
                                                    </Button>
                                                {/if}
                                            {:else}
                                                {#if row.combos.length === 0}
                                                    <span class="text-white/70 text-sm">
                                                        {$LL.menu.shortcuts.edit.none()}
                                                    </span>
                                                {/if}
                                                {#each row.combos as combo, comboIndex (comboIndex)}
                                                    {#if comboIndex > 0}
                                                        <span class="text-white/70 text-sm px-1"
                                                            >{$LL.menu.shortcuts.or()}</span
                                                        >
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
                                                {#if editing}
                                                    <span
                                                        class="ms-1 text-white/60"
                                                        title={$LL.menu.shortcuts.edit.locked()}
                                                        aria-label={$LL.menu.shortcuts.edit.locked()}
                                                        role="img"
                                                    >
                                                        <IconLock />
                                                    </span>
                                                {/if}
                                            {/if}
                                        </div>
                                    </div>
                                    {#if editing && problem && problem.action === action}
                                        <div
                                            role="alert"
                                            class="flex flex-wrap items-center gap-2 mb-3 p-3 rounded-lg bg-warning/20 border border-solid border-warning"
                                        >
                                            <span class="grow basis-48 text-white text-sm">{problemText}</span>
                                            {#if problem.kind === "taken"}
                                                <Button variant="warning" size="sm" onclick={replace}>
                                                    {$LL.menu.shortcuts.edit.replace()}
                                                </Button>
                                            {/if}
                                            <Button
                                                variant="light"
                                                appearance="border"
                                                size="sm"
                                                onclick={() => (problem = null)}
                                            >
                                                {$LL.menu.shortcuts.edit.cancel()}
                                            </Button>
                                        </div>
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
